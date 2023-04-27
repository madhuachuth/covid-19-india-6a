const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const dbPath = path.join(__dirname, "covid19India.db");

const app = express();
app.use(express.json());

let database = null;
const initializationDbAndServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};
initializationDbAndServer();

const convertSnakeCaseToCamelCase = (dataObject) => {
  return {
    stateId: dataObject.state_id,
    stateName: dataObject.state_name,
    population: dataObject.population,
  };
};

const convertSnakeCaseToCamelCaseInDistrict = (dataObject) => {
  return {
    districtId: dataObject.district_id,
    districtName: dataObject.district_name,
    stateId: dataObject.stateId,
    cases: dataObject.cases,
    cured: dataObject.cured,
    active: dataObject.active,
    deaths: dataObject.deaths,
  };
};

const convertDbObject = (dbObjects) => {
  return {
    stateName: dbObjects.state_name,
  };
};

// GET States API
app.get("/states/", async (request, response) => {
  const statesDetails = `
        SELECT 
          *
        FROM
           state ;
    `;
  const statesArray = await database.all(statesDetails);
  response.send(
    statesArray.map((eachSTate) => convertSnakeCaseToCamelCase(eachSTate))
  );
});

//GET state API
app.get("/states/:statesId/", async (request, response) => {
  const { statesId } = request.params;
  const getState = `
        SELECT 
          *
        FROM 
            state
        WHERE
            state_id = ${statesId} ;
    `;
  const getStateDetail = await database.get(getState);
  response.send(convertSnakeCaseToCamelCase(getStateDetail));
});

//post district API
app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const postDistrictQuarry = `
    INSERT INTO 
        district (district_name,state_id,cases,cured,active,deaths)
    VALUES
    ('${districtName}',${stateId},${cases},${cured},${active},${deaths});`;
  await database.run(postDistrictQuarry);
  response.send("District Successfully Added");
});

//GET district API
app.get("/districts/:districtId", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuarry = `
    SELECT 
      * 
    FROM 
     district
    WHERE 
        district_id = ${districtId};`;
  const getDistrict = await database.get(getDistrictQuarry);
  response.send(convertSnakeCaseToCamelCaseInDistrict(getDistrict));
});

// delete district API
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteQuarry = `
    DELETE FROM
        district
    WHERE
        district_id = ${districtId};`;
  await database.run(deleteQuarry);
  response.send("District Removed");
});

// put district API
app.put("/districts/:districtId/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const { districtId } = request.params;
  const updateQuarry = `
        UPDATE 
            district
        SET
            district_name = '${districtName}',
            state_id = ${stateId},
            cases = ${cases},
            cured = ${cured},
            active = ${active},
            deaths = ${deaths};
        WHERE 
            district_id = ${districtId}`;

  await database.run(updateQuarry);
  response.send("District Details Updated");
});

//GET states/stats API
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStateStatsQuarry = `
    SELECT
        SUM(cases),
        SUM(cured),
        SUM(active),
        SUM(deaths)
    FROM
        district
    WHERE
        state_id =${stateId};`;
  const stats = await database.get(getStateStatsQuarry);
  console.log(stats);
  response.send({
    totalCases: stats["SUM(cases)"],
    totalCured: stats["SUM(cured)"],
    totalActive: stats["SUM(active)"],
    totalDeaths: stats["SUM(deaths)"],
  });
});

// GET district/state API
app.get("/districts/:districtId/details", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuarry = `
        SELECT 
          state_name
        FROM 
            district
            NATURAL JOIN
            state
        WHERE 
            district_id = ${districtId}; `;
  const dbResponse = await database.get(getDistrictQuarry);
  response.send(convertDbObject(dbResponse));
});

module.exports = app;
