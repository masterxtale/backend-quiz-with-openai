import { GoogleGenerativeAI } from "@google/generative-ai";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 🔥 cache por tema (pra manter sequência)
const cache = {};

// ====================== GERAR 10 PERGUNTAS ======================
async function gerarPerguntas(tema) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
  Crie 10 perguntas de múltipla escolha sobre ${tema}.

  Formato JSON:
  [
    {
      "pergunta": "...",
      "alternativas": ["...", "...", "...", "..."],
      "resposta": "..."
    }
  ]
  `;

  const result = await model.generateContent(prompt);
  let text = result.response.text();

  // limpa markdown se vier
  text = text.replace(/```json|```/g, "");

  try {
    return JSON.parse(text);
  } catch (err) {
    console.log("Erro JSON:", text);
    return [];
  }
}

// ====================== ROTA PRINCIPAL ======================
app.post("/quiz", async (req, res) => {
  const { tema } = req.body;

  if (!tema) {
    return res.status(400).json({ error: "Tema obrigatório" });
  }

  try {
    // se não tiver cache, gera
    if (!cache[tema] || cache[tema].length === 0) {
      const perguntas = await gerarPerguntas(tema);

      cache[tema] = {
        lista: perguntas,
        index: 0
      };
    }

    const atual = cache[tema];

    // pega próxima pergunta
    const pergunta = atual.lista[atual.index];
    atual.index++;

    // se acabou, limpa cache
    if (atual.index >= atual.lista.length) {
      delete cache[tema];
    }

    res.json(pergunta);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao gerar quiz" });
  }
});

// ====================== TESTE ======================
app.get("/", (req, res) => {
  res.send("Backend funcionando!");
});

app.listen(3001, () => {
  console.log("Servidor rodando na porta 3001");
});