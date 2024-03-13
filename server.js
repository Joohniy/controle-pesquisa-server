const express = require("express");
const app = express();
const cors = require("cors");
const mysql = require("mysql2/promise");
const db = require("./dbConfig");

app.use(express.json());
app.use(cors());

app.post("/register/pesquisa", async (req, res) => {
  const { tipo_requer, numpesquisa, date, numprocesso, name, anexos } =
    req.body;
  try {
    if (tipo_requer === "Pesquisa") {
      if (anexos.length > 0) {
        const cadastrarPesquisa = await db.query(
          "INSERT INTO cadastrados_pesquisa (tipo_requer, numpesquisa, date, numprocesso, name) VALUES (?, ?, ?, ?, ?)",
          [tipo_requer, numpesquisa, date, numprocesso, name]
        );
        const generatedIdPesquisa = cadastrarPesquisa[0].insertId;
        const processosAnexosPesquisa = anexos.map((anexo) => [
          anexo,
          generatedIdPesquisa,
        ]);
        await db.query(
          `INSERT INTO processos_anexos_pesquisa (processo_anexo, id_processo_principal_pesquisa) VALUES ?`,
          [processosAnexosPesquisa]
        );
        res
          .status(200)
          .json("Pedido de pesquisa e anexos cadastrados com sucesso");
      } else {
        await db.query(
          "INSERT INTO cadastrados_pesquisa (tipo_requer, numpesquisa, date, numprocesso, name) VALUES (?, ?, ?, ?, ?)",
          [tipo_requer, numpesquisa, date, numprocesso, name]
        );
        res.status(200).json("Pedido de pesquisa cadastrado com sucesso");
      }
    } else {
    }
  } catch (err) {
    console.log(err);
    res.status(500).json("Erro no servidor");
    return;
  }
});

app.post("/register/oficio", async (req, res) => {
  const {
    tipo_requer,
    secretaria,
    numoficio,
    date,
    numprocesso,
    name,
    anexos,
  } = req.body;
  try {
    if (anexos.length > 0) {
      const cadastrarOficio = await db.query(
        "INSERT INTO cadastrados_oficio (tipo_requer, secretaria, numoficio, date, numprocesso, name) VALUES (?, ?, ?, ?, ?, ?)",
        [tipo_requer, secretaria, numoficio, date, numprocesso, name]
      );
      const generatedIdOficio = cadastrarOficio[0].insertId;
      const processosAnexosOficio = anexos.map((anexo) => [
        anexo,
        generatedIdOficio,
      ]);
      await db.query(
        "INSERT INTO processos_anexos_oficio (processo_anexo, id_processo_principal_oficio) VALUES ?",
        [processosAnexosOficio]
      );
      res.status(200).json("Pedido de oficio e anexos cadastrado com sucesso");
    } else {
      await db.query(
        "INSERT INTO cadastrados_oficio (tipo_requer, secretaria, numoficio, date, numprocesso, name) VALUES (?, ?, ?, ?, ?, ?)",
        [tipo_requer, secretaria, numoficio, date, numprocesso, name]
      );
      res.status(200).json("Pedido de oficio cadastrado com sucesso");
    }
  } catch (error) {
    res.status(500).json("Erro no servidor");
    return;
  }
});

app.get("/main", async (req, res) => {
  try {
    const dataOficioAndPesquisa = await db.query(
      "SELECT id_oficios as id, tipo_requer, secretaria as sec, numoficio as numero, numprocesso, name, date FROM cadastrados_oficio UNION ALL SELECT id_pesquisa as id, tipo_requer, null as sec, numpesquisa as numero, numprocesso, name, date FROM cadastrados_pesquisa "
    );
    res.status(200).json({ dataValues: dataOficioAndPesquisa });
  } catch (err) {
    console.log(err);
    res
      .status(404)
      .json("Algo deu errado ao mostrar as informações cadastradas.");
    return;
  }
});

app.get("/main/anexos/:id/:requer", async (req, res) => {
  const { id, requer } = req.params;
  if (!id && !requer) {
    return res.status(404).send("id ou tipo de requerimento invalidos.");
  }
  try {
    const anexosPesquisa = await db.query(
      "SELECT processo_anexo, id_processos_anexospesquisa as id_anexo FROM processos_anexos_pesquisa WHERE id_processo_principal_pesquisa = ?",
      [id]
    );
    const anexosOficio = await db.query(
      "SELECT processo_anexo, id_processos_anexosoficio as id_anexo FROM processos_anexos_oficio WHERE id_processo_principal_oficio = ?",
      [id]
    );
    if (requer === "Oficio") {
      res.json({ anexos: anexosOficio });
      res.status(200);
    } else {
      res.json({ anexos: anexosPesquisa });
      res.status(200);
    }
  } catch (err) {
    console.log(err);
    res.status(404).json("Erro ao selecionar anexos para visualização");
    return;
  }
});

app.post("/main/anexos/delete", async (req, res) => {
  const { tipoRequer, idAnexoOficio, idAnexoPesquisa } = req.body;
  if (!tipoRequer && !idAnexoOficio && !idAnexoPesquisa) {
    return res
      .status(404)
      .json("Erro ao identificar parametros para deletar os anexos");
  }
  try {
    if (tipoRequer === "Pesquisa") {
      await db.query(
        "DELETE FROM processos_anexos_pesquisa WHERE id_processos_anexospesquisa = ?",
        [idAnexoPesquisa]
      );
      const updatedAnexosAfterDeletePesquisa = await db.query(
        "SELECT * FROM processos_anexos_pesquisa WHERE id_processos_anexospesquisa = ?",
        [idAnexoPesquisa]
      );
      res.status(200).json({
        message: "Anexo Oficio deletado com sucesso",
        updatedAnexosAfterDelete: updatedAnexosAfterDeletePesquisa,
      });
    } else {
      await db.query(
        "DELETE FROM processos_anexos_oficio WHERE id_processos_anexosoficio = ?",
        [idAnexoOficio]
      );
      const updatedAnexosAfterDeleteOficio = await db.query(
        "SELECT * FROM processos_anexos_oficio WHERE id_processos_anexosoficio = ?",
        [idAnexoOficio]
      );
      res.status(200).json({
        message: "Anexo Pesquisa Deletado com sucesso",
        updatedAnexosAfterDelete: updatedAnexosAfterDeleteOficio,
      });
    }
  } catch (err) {
    console.log(err);
    res.status(404).json("Erro ao deletar anexos");
    return;
  }
});

app.delete("/main/delete/:cellId/:requer", async (req, res) => {
  const { cellId, requer } = req.params;
  console.log(req.params)
  if (!cellId) {
    res.status(404).json("Operação não concluída");
    return;
  }
  async function runTransaction() {
    const connection = await db.getConnection();
    await connection.beginTransaction();
    try {
      if (requer === "Pesquisa") {
        await db.query(
          "DELETE FROM processos_anexos_pesquisa WHERE id_processo_principal_pesquisa = ?",
          [cellId]
        );
        await db.query(
          "DELETE FROM observacoes_pesquisa WHERE id_pesquisa = ?",
          [cellId]
        );
        await db.query(
          "DELETE FROM cadastrados_pesquisa WHERE id_pesquisa = ?",
          [cellId]
        );
        res.status(200).json("Pedido de pesquisa deletado com sucesso");
      } else {
        await db.query(
          "DELETE FROM processos_anexos_oficio WHERE id_processo_principal_oficio = ?",
          [cellId]
        );
        await db.query("DELETE FROM observacoes_oficio WHERE id_oficios = ?", [
          cellId,
        ]);
        await db.query("DELETE FROM cadastrados_oficio WHERE id_oficios = ?", [
          cellId,
        ]);
        res.status(200).json("Pedido de Oficio deletado com sucesso");
        await connection.commit();
      }
    } catch (err) {
      console.log(err);
      await connection.rollback();
      res.status(404).json("Server, error. Algo deu errado em deletar ao célula");
    }
  }
  runTransaction().catch((err) =>
    console.error(err, "Error in sql transaction")
  );
});

app.post("/main/edit", async (req, res) => {
  const {
    id,
    tipo_requer,
    newDate,
    newSecretaria,
    newNumOficio,
    newNumPesquisa,
    newNumProcesso,
    newName,
    existingValues,
  } = req.body;
  try {
    if (tipo_requer === "Oficio") {
      await db.query(
        "UPDATE cadastrados_oficio SET secretaria = ?, date = ?, numoficio = ?, numprocesso = ?, name = ? WHERE id_oficios = ?",
        [
          newSecretaria || existingValues.sec,
          newDate || existingValues.date,
          newNumOficio || existingValues.numero,
          newNumProcesso || existingValues.numprocesso,
          newName || existingValues.name,
          id,
        ]
      );
      res.status(200).json("Editado com sucesso");
    } else {
      await db.query(
        "UPDATE cadastrados_pesquisa SET numpesquisa = ?, date = ?, numprocesso = ?, name = ? WHERE id_pesquisa = ?",
        [
          newNumPesquisa || existingValues.numero,
          newDate || existingValues.date,
          newNumProcesso || existingValues.numprocesso,
          newName || existingValues.name,
          id,
        ]
      );
      res.status(200).json("Editado com sucesso");
    }
  } catch (err) {
    console.log(err);
    res.status(404).json("Não foi possivel editar a celula");
  }
});

app.get("/main/edit/:id/:tipoRequer", async (req, res) => {
  const { id, tipoRequer } = req.params;
  try {
    const anexosPesquisa = await db.query(
      "SELECT * FROM processos_anexos_pesquisa WHERE id_processo_principal_pesquisa = ?",
      [id]
    );
    const anexosOficio = await db.query(
      "SELECT * FROM processos_anexos_oficio WHERE id_processo_principal_oficio = ?",
      [id]
    );
    if (tipoRequer === "Oficio") {
      res.status(200).json({ anexos: anexosOficio });
    } else {
      res.status(200).json({ anexos: anexosPesquisa });
    }
  } catch (err) {
    console.log(err);
    res.status(404).json("Ocorreu um erro ao mostrar os anexos propostos");
  }
});

app.post("/main/edit/anexos/add", async (req, res) => {
  const { tipoRequer, mainCellId, newAnexos } = req.body;
  try {
    if (tipoRequer === "Pesquisa" && newAnexos.length > 0) {
      const linkIdAndAnexosPesquisa = newAnexos.map((valuesNewAnexos) => [
        valuesNewAnexos,
        mainCellId,
      ]);
      await db.query(
        "INSERT INTO processos_anexos_pesquisa (processo_anexo, id_processo_principal_pesquisa) VALUES ?",
        [linkIdAndAnexosPesquisa]
      );
      const updatedListAnexosToEditPesquisa = await db.query(
        "SELECT * FROM processos_anexos_pesquisa WHERE id_processo_principal_pesquisa = ?",
        [mainCellId]
      );
      res.status(200).json({
        message: "Anexos incluidos com sucesso",
        updatedListAnexosToEdit: updatedListAnexosToEditPesquisa,
      });
    } else {
      const linkIdAndAnexosOficios = newAnexos.map((newAnexosValues) => [
        newAnexosValues,
        mainCellId,
      ]);
      await db.query(
        "INSERT INTO processos_anexos_oficio (processo_anexo, id_processo_principal_oficio) VALUES ?",
        [linkIdAndAnexosOficios]
      );
      const updatedListAnexosToEditOficio = await db.query(
        "SELECT * FROM processos_anexos_oficio WHERE id_processo_principal_oficio = ?",
        [mainCellId]
      );
      res.status(200).json({
        message: "Anexos incluidos com sucesso",
        updatedListAnexosToEdit: updatedListAnexosToEditOficio,
      });
    }
  } catch (err) {
    console.log(err);
    res
      .status(404)
      .send("Certifique-se de adicionar os anexos clicando no icone '+'.");
    return;
  }
});

app.post("/observacoes", async (req, res) => {
  const { id, tipo_requer, observacao, dateObs } = req.body;
  try {
    if (tipo_requer === "Pesquisa") {
      await db.query(
        "INSERT INTO observacoes_pesquisa (observacao_pesquisa, id_pesquisa, date_obspesq) VALUES (?, ?, ?)",
        [observacao, id, dateObs]
      );
      res.json("Observação adicionada");
      res.status(200);
    } else {
      await db.query(
        "INSERT INTO observacoes_oficio (observacao_oficio, id_oficios, date_obsof) VALUES (?, ?, ?)",
        [observacao, id, dateObs]
      );
      res.json("Observação adicionada");
      res.status(200);
    }
  } catch (error) {
    console.log(error);
    res
      .status(404)
      .send(
        "Certifique-se de adicionar os anexos clicando no icone '+'.",
        error.message
      );
    return;
  }
});

app.get("/observacoes/:tipo/:id", async (req, res) => {
  const { tipo, id } = req.params;
  try {
    const obsOficio = await db.query(
      "SELECT id_obsoficio as id, observacao_oficio as observacao, date_obsof as date FROM observacoes_oficio WHERE id_oficios = ?",
      [id]
    );
    const obsPesquisa = await db.query(
      "SELECT id_obspesquisa as id, observacao_pesquisa as observacao, date_obspesq as date FROM observacoes_pesquisa WHERE id_pesquisa = ?",
      [id]
    );
    if (tipo === "Oficio") {
      res.status(200).json({ observacoes: obsOficio });
    } else {
      res.status(200).json({ observacoes: obsPesquisa });
    }
  } catch (error) {
    res.status(404).json("Server error", error.message);
    return;
  }
});

app.delete("/observacoes/delete/:tipoRequer/:idObs", async (req, res) => {
  const { idObs, tipoRequer } = req.params;
  try {
    await db.query("DELETE FROM observacoes_oficio WHERE id_obsoficio = ?", 
    [idObs]
    );
    await db.query(
      "DELETE FROM observacoes_pesquisa WHERE id_obspesquisa = ?",
      [idObs]
    );
    if (tipoRequer === "Oficio") {
      return res.status(200).json("Observacao Oficio excluida.");
    } else {
      return res.status(200).json("Observacao Pesquisa excluida");
    }
  } catch (err) {
    console.log(err);
    res.status(500).json(`Ocorreu um erro ao deleter sua ${tipoRequer}`);
    return;
  }
});

app.post("/pesquisas/register", async (req, res) => {
  const { requerente, endereco, numero, numdigital, nprocesso, anexos } =
    req.body;
  try {
    if (anexos.length > 0) {
      const requerimentoPesquisa = await db.query(
        "INSERT INTO requerimento_cadastrado (requerente, endereco, numero_imovel, numdigital, numero_processo) VALUES (?, ?, ?, ?, ?)",
        [requerente, endereco, numero, numdigital, nprocesso]
      );
      const requerimentoPesquisaId = requerimentoPesquisa[0].insertId;
      const requerimentoAnexos = anexos.map((anexo) => [
        anexo,
        requerimentoPesquisaId,
      ]);
      await db.query(
        "INSERT INTO requerimento_cadastrado_anexos (anexos, id_requerimento_cadastrado_processo) VALUES ?",
        [requerimentoAnexos]
      );
      res.status(200).json("Cadastrado com sucesso");
    } else {
      await db.query(
        "INSERT INTO requerimento_cadastrado (requerente, endereco, numero_imovel, numdigital, numero_processo) VALUES (?, ?, ?, ?, ?)",
        [requerente, endereco, numero, numdigital, nprocesso]
      );
      res.status(200).json("Cadastrado com sucesso");
    }
  } catch (error) {
    return res.status(500).json("Server error");
  };
});

app.get("/pesquisas", async (req, res) => {
  try {
    const dataPesquisas = await db.query(
      "SELECT id_requerimento_cadastrado as id, requerente, endereco, numero_imovel, numero_processo, numdigital FROM requerimento_cadastrado"
    );
    res.status(200).json({ pesquisas: dataPesquisas });
  } catch (error) {
    return res.status(500).json("Server error"); 
  }
});

app.get("/pesquisas/anexos/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const anexos = await db.query(
      "SELECT id_requerimento_cadastrado_anexos as id_anexo, anexos FROM requerimento_cadastrado_anexos WHERE id_requerimento_cadastrado_processo = ?",
      [id]
    );
    res.status(200).json({ anexos: anexos });
  } catch (error) {
    return res.status(500).json("Server error");
  }
});

app.post("/pesquisas/add", async (req, res) => {
  const { id, newProcesso, anexos, processoAlreadyRegistered } = req.body;

  try {
    if (anexos.length > 0) {
      const requerimentoAnexos = anexos.map((anexo) => [anexo, id]);
      await db.query(
        "INSERT INTO requerimento_cadastrado_anexos (anexos, id_requerimento_cadastrado_processo) VALUES ?",
        [requerimentoAnexos]
      );
      res.status(200).json("Cadastrado novo processo c/ anexos");
    } else {
      await db.query(
        "UPDATE requerimento_cadastrado SET numero_processo = ? WHERE id_requerimento_cadastrado = ?",
        [newProcesso || processoAlreadyRegistered, id]
      );
      res.status(200).json("Cadastrado novo processo s/ anexos");
    }
  } catch (error) {
    console.log("Server error", error.message);
  }
});

app.delete("/pesquisas/delete/:id", async (req, res) => {
  const { id } = req.params;
  async function runTransaction() {
    const connection = await db.getConnection();
    await connection.beginTransaction();
    try {
      await db.query(
        "DELETE FROM requerimento_cadastrado_observacoes WHERE id_requerimento_cadastrado = ?", 
        [id]
      );
      await db.query(
        "DELETE FROM requerimento_cadastrado_anexos WHERE id_requerimento_cadastrado_processo = ?",
        [id]
      );
      await db.query(
        "DELETE FROM requerimento_cadastrado WHERE id_requerimento_cadastrado = ?",
        [id]
      );
      await connection.commit();
      res.status(200).json("Celula deletada com sucesso");
    } catch (error) {
      await connection.rollback();
      res.status(500).json("Server error");
    }
  }
  runTransaction().catch((err) =>
    console.log(err, "Algo deu errado na transaction")
  );
});

app.post("/pesquisas/observacoes", async (req, res) => {
  const { requerimentoId, observacao, date } = req.body;
  try {
    await db.query(
      "INSERT INTO requerimento_cadastrado_observacoes (observacao, date, id_requerimento_cadastrado) VALUES (?, ?, ?)",
      [observacao, date, requerimentoId]
    );
    res.status(200).json("Observação cadastrada com sucesso");
  } catch (error) {
    console.log(error.message);
    res.status(500).json("Server error");
  }
});

app.get("/pesquisas/observacoes/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const queryObservacoes = await db.query(
      "SELECT * FROM requerimento_cadastrado_observacoes WHERE id_requerimento_cadastrado = ?",
      [id]
    );
    res.status(200).json({ observacoes: queryObservacoes });
  } catch (error) {
    console.log(error);
    res.status(500).json("Server error");
  }
});

app.delete("/observacoes/delete/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.query(
      "DELETE FROM requerimento_cadastrado_observacoes WHERE id_requerimento_observacoes = ?",
      [id]
    );
    res.status(200).json("Observacao excluida com sucesso");
  } catch (error) {
    console.log(error);
    res.status(500).json("Server error");
  }
});

app.post("/pesquisas/edit", async (req, res) => {
  const {
    newValues: {
      newrequerente,
      newendereco,
      newnumeroImovel,
      newprocesso,
      newnumdigital,
    },
    existingValues: {
      id,
      requerente,
      endereco,
      numero_imovel,
      numero_processo,
      numdigital,
    },
  } = req.body;

  try {
   await db.query(
      "UPDATE requerimento_cadastrado SET requerente = ?, endereco = ?, numero_imovel = ?, numero_processo = ?, numdigital = ? WHERE id_requerimento_cadastrado = ?",
      [
        newrequerente || requerente,
        newendereco || endereco,
        newnumeroImovel || numero_imovel,
        newprocesso || numero_processo,
        newnumdigital || numdigital,
        id,
      ]
    );
    res.status(200).json("Valores Atualizados")
  } catch (error) {
    console.log(error.message);
    res.status(500).json("Server error")
  }
});

app.get("/pesquisas/edit/anexos/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const anexos = await db.query(
      "SELECT anexos FROM requerimento_cadastrado_anexos WHERE id_requerimento_cadastrado_processo = ?",
      [id]
    )
    res.status(200).json({ anexos: anexos })
  } catch (error) {
    console.log(error.message)
    res.status(500).json({ message: error.message })
  }
});

app.listen(3030, () => {
  console.log("Running on port http://localhost:3030");
});
