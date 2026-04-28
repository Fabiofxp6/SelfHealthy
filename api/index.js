const { app, connectToDatabase } = require('../javascript/server');

module.exports = async (req, res) => {
  try {
    await connectToDatabase();
  } catch (err) {
    console.error("Erro ao conectar no MongoDB:", err);
    return res.status(500).send("Erro de configuração do servidor.");
  }

  return app(req, res);
};
