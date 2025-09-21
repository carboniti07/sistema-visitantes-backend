const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Conexão com MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB conectado"))
.catch(err => console.error("❌ Erro ao conectar MongoDB:", err));

// Importa secretários de arquivo (não vai para o banco)
const SECRETARIOS = require("./secretarios.json");

// Schema e Model para Visitantes
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

// Rota de login (continua usando secretarios.json)
app.post("/login", (req, res) => {
  const { matricula, cpf } = req.body;
  const cleanCpf = cpf.replace(/\D/g, "");

  const found = SECRETARIOS.find(
    (s) => s.matricula === String(matricula).trim() && s.cpf === cleanCpf
  );

  if (!found) {
    return res.status(401).json({ message: "Matrícula ou CPF inválidos." });
  }

  return res.json({
    nome: found.nome,
    matricula: found.matricula,
    congregacao: found.congregacao,
    isSede: found.isSede,
  });
});

// CRUD de visitantes (MongoDB)
app.get("/visitantes", async (req, res) => {
  const lista = await Visitante.find();
  res.json(lista);
});

app.post("/visitantes", async (req, res) => {
  const novo = new Visitante(req.body);
  await novo.save();
  res.json(novo);
});

app.delete("/visitantes/:id", async (req, res) => {
  await Visitante.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
});
