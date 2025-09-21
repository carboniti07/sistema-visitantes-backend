// server.js
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path"); // 👈 necessário para servir o build React
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// 🔹 Conexão MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ Conectado ao MongoDB"))
.catch((err) => console.error("❌ Erro ao conectar ao MongoDB:", err));

// 🔹 Modelo Visitante
const VisitanteSchema = new mongoose.Schema({
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
  comoconheceuLabel: String,
  dataHora: String,
  whatsapp: String,
}, { timestamps: true });

const Visitante = mongoose.model("Visitante", VisitanteSchema);

// 🔹 Secretários continuam no JSON (só login)
const SECRETARIOS = require("./secretarios.json");

// Login
app.post("/login", (req, res) => {
  const { matricula, cpf } = req.body;
  const cleanCpf = cpf.replace(/\D/g, "");

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

// CRUD Visitantes
app.get("/visitantes", async (req, res) => {
  try {
    const lista = await Visitante.find().sort({ createdAt: -1 });
    res.json(lista);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar visitantes" });
  }
});

app.post("/visitantes", async (req, res) => {
  try {
    const novo = new Visitante(req.body);
    await novo.save();
    res.json(novo);
  } catch (err) {
    res.status(500).json({ error: "Erro ao salvar visitante" });
  }
});

app.delete("/visitantes/:id", async (req, res) => {
  try {
    await Visitante.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar visitante" });
  }
});

// Healthcheck separado (prefixo /api para não conflitar com React)
app.get("/api/health", (req, res) => {
  res.send("✅ API Visitantes rodando");
});

// 🔹 Servir arquivos do React build
app.use(express.static(path.join(__dirname, "build")));

// 🔹 Fallback: qualquer rota não-API cai no index.html do React
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

// Start
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
