// server.js
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// 🔹 Conexão MongoDB Atlas
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Conectado ao MongoDB"))
  .catch((err) => console.error("❌ Erro ao conectar ao MongoDB:", err));

// =======================================================
// 🧩 Modelo Visitante (atualizado)
// =======================================================
const VisitanteSchema = new mongoose.Schema(
  {
    nome: String,
    sexo: String,
    perfilEtario: String,
    tipoCulto: String,
    congregacao: String,
    frequenta: String,
    qualIgreja: String,
    procurando: String,
    temCargo: String,
    cargo: String,
    cargoLabel: String, // ✅ novo (texto pronto p/ homem/mulher)
    comoconheceu: String,
    comoconheceuLabel: String,
    nomeConvidador: String,
    dataHora: String,
    whatsapp: String,

    // ✅ NOVO: LGPD (não existia no schema, por isso não salvava)
    receberInformativos: { type: String, default: "" }, // "sim" | "não" | ""

    // 🧩 Campos para famílias
    isFamilia: { type: Boolean, default: false },
    membrosFamilia: { type: [String], default: [] },
    totalPessoas: { type: Number, default: 1 },

    // ✅ NOVO: salvar os dados de cada membro (sexo/perfil/cargo por pessoa)
    membrosDetalhes: {
      type: [
        {
          nome: String,
          sexo: String,
          perfilEtario: String,
          temCargo: String,
          cargo: String,
          cargoLabel: String,
        },
      ],
      default: [],
    },

    // antigos (mantidos para compatibilidade)
    familia: { type: String, default: "" },
    representante: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Visitante = mongoose.model("Visitante", VisitanteSchema);

// =======================================================
// 🔹 Login Secretários (mantido)
// =======================================================
const SECRETARIOS = require("./secretarios.json");

app.post("/login", (req, res) => {
  const { matricula, cpf } = req.body;
  const cleanCpf = (cpf || "").replace(/\D/g, "");

  const found = SECRETARIOS.find(
    (s) => s.matricula === String(matricula).trim() && s.cpf === cleanCpf
  );

  if (!found) {
    return res.status(401).json({ message: "Matrícula ou CPF inválidos." });
  }

  res.json({
    nome: found.nome,
    matricula: found.matricula,
    congregacao: found.congregacao,
    isSede: found.isSede,
  });
});

// =======================================================
// 🔹 CRUD Visitantes
// =======================================================

// Listar todos
app.get("/visitantes", async (req, res) => {
  try {
    const lista = await Visitante.find().sort({ createdAt: -1 });
    res.json(lista);
  } catch (err) {
    console.error("Erro ao buscar visitantes:", err);
    res.status(500).json({ error: "Erro ao buscar visitantes" });
  }
});

// Criar (individual ou família) - ✅ CORRIGIDO
app.post("/visitantes", async (req, res) => {
  try {
    const body = req.body || {};

    // ✅ Normaliza membrosFamilia SEMPRE como array de strings
    const membrosFamilia = Array.isArray(body.membrosFamilia)
      ? body.membrosFamilia
          .map((n) => String(n || "").trim())
          .filter((n) => n.length > 0)
      : [];

    // ✅ Normaliza membrosDetalhes SEMPRE como array (se vier)
    const membrosDetalhes = Array.isArray(body.membrosDetalhes)
      ? body.membrosDetalhes
          .map((m) => ({
            nome: String(m?.nome || "").trim(),
            sexo: String(m?.sexo || "").trim(),
            perfilEtario: String(m?.perfilEtario || "").trim(),
            temCargo: String(m?.temCargo || "").trim(),
            cargo: String(m?.cargo || "").trim(),
            cargoLabel: String(m?.cargoLabel || "").trim(),
          }))
          .filter((m) => m.nome.length > 0)
      : [];

    // ✅ Monta um objeto novo (não mexe no req.body direto)
    const doc = {
      ...body,
      membrosFamilia,
      membrosDetalhes,

      // ✅ garante que LGPD salva (agora existe no schema)
      receberInformativos: String(body.receberInformativos || "").trim(),
      procurando: String(body.procurando || "").trim(),
      comoconheceuLabel: String(body.comoconheceuLabel || "").trim(),
      cargoLabel: String(body.cargoLabel || "").trim(),
    };

    // ✅ Regras família vs individual
    if (doc.isFamilia) {
      // se tiver membrosDetalhes, preferir ele para calcular total e nome
      const nomesBase = membrosDetalhes.length > 0 ? membrosDetalhes.map((m) => m.nome) : membrosFamilia;

      doc.totalPessoas = nomesBase.length || 1;
      doc.nome = nomesBase[0] || "Família visitante";

      // se veio membrosDetalhes, mas não veio membrosFamilia, cria membrosFamilia automaticamente
      if (membrosDetalhes.length > 0 && membrosFamilia.length === 0) {
        doc.membrosFamilia = membrosDetalhes.map((m) => m.nome);
      }
    } else {
      doc.totalPessoas = 1;

      // ✅ se veio membrosDetalhes (do formulário novo), usa o primeiro para preencher campos antigos
      if (membrosDetalhes.length > 0) {
        const m0 = membrosDetalhes[0];
        doc.nome = doc.nome || m0.nome || doc.nome;
        doc.sexo = doc.sexo || m0.sexo || doc.sexo;
        doc.perfilEtario = doc.perfilEtario || m0.perfilEtario || doc.perfilEtario;
        doc.temCargo = doc.temCargo || m0.temCargo || doc.temCargo;
        doc.cargo = doc.cargo || m0.cargo || doc.cargo;
        doc.cargoLabel = doc.cargoLabel || m0.cargoLabel || doc.cargoLabel;
      }
    }

    const novo = await Visitante.create(doc);
    res.json(novo);
  } catch (err) {
    console.error("Erro ao salvar visitante:", err);
    res.status(500).json({ error: "Erro ao salvar visitante" });
  }
});

// Deletar
app.delete("/visitantes/:id", async (req, res) => {
  try {
    await Visitante.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error("Erro ao deletar visitante:", err);
    res.status(500).json({ error: "Erro ao deletar visitante" });
  }
});

// =======================================================
// 🔹 Healthcheck e build
// =======================================================
app.get("/api/health", (req, res) => {
  res.send("✅ API Visitantes rodando");
});

app.use(express.static(path.join(__dirname, "build")));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
