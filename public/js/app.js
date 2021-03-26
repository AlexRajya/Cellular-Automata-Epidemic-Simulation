//Functions to generate randoms
function randomizeProbWithNormalDistribution(mu, varCoeff) {
  var stddev = mu*varCoeff;
  var prob = normal_random(mu, stddev*stddev);
  if (prob > 1) {
    prob = 1;
  }
  if (prob < 0) {
    prob = 0;
  }
  return prob;
}

function normal_random(mean, variance) {
  if (mean == undefined)
    mean = 0.0;
  if (variance == undefined)
    variance = 1.0;
  var V1, V2, S;
  do {
    var U1 = Math.random();
    var U2 = Math.random();
    V1 = 2 * U1 - 1;
    V2 = 2 * U2 - 1;
    S = V1 * V1 + V2 * V2;
  } while (S > 1);

  X = Math.sqrt(-2 * Math.log(S) / S) * V1;
//  Y = Math.sqrt(-2 * Math.log(S) / S) * V2;
  X = mean + Math.sqrt(variance) * X;
//  Y = mean + Math.sqrt(variance) * Y ;
  return X;
}

//Convert array of cells into 2D array
function get2D(cells) {
  var temp = [];
  var twoD = [];
  for (var i = 0; i < cells.length; i++){
    temp.push(cells[i]);
    if (temp.length == 40){
      twoD.push(temp);
      temp = [];
    }
  }
  return twoD;
}

//# Cell class
// This class represents one cell in the grid.
class Cell {
  constructor(population, populationLimit) {
    this.populationLimit = populationLimit;
    this.susceptible = population;
    this.incubated = [];
    this.infected = [];
    this.recovered = 0;
    this.susAway = 0;
    this.infAway = 0;
  }

  get populationCount() {
    return Math.round(this.incubatedCount + this.infectedCount +
      this.recovered + this.susceptible - this.susAway - this.infAway);
  }

  get infectedCount() {return Math.round((this.infected).reduce((a, b) => a + b, 0));}
  get incubatedCount() {return Math.round((this.incubated).reduce((a, b) => a + b, 0));}
  get susceptibleCount() {return this.susceptible;}
  get recoveredCount() {return Math.round(this.recovered);}

  addInfected(val) {
    this.infected.push(val);
  }

  getImmigrants(immigrationRate, illImmigrationRate) {
    var toMoveInf = this.infectedCount * illImmigrationRate;
    this.infAway = toMoveInf;

    var toMoveSus = this.susceptible * immigrationRate;
    this.susAway = toMoveSus;

    return [toMoveInf, toMoveSus];
  }

  returnImmigrants(newInf){
    //add newly infected to incubated queue
    if (this.incubated.length > 0){
      this.incubated[(this.incubated.length - 1)] += newInf;
    }else{
      this.incubated[0] = newInf;
    }
    this.susceptible -= newInf;
    this.susAway = 0;
    this.infAway = 0;
  }

  simNaturalDeaths(prob) {
    this.susceptible -=  Math.round(this.susceptible * prob);
    //Apply natural death prob to all in queue
    for (var i = 0; i < this.incubated.length; i++) {
      this.incubated[i] -=  Math.round(this.incubated[i] * prob);
    }
    //Apply natural death prob to all in queue
    for (var i = 0; i < this.infected.length; i++) {
      this.infected[i] -=  Math.round(this.infected[i] * prob);
    }
    this.recovered -= Math.round(this.recovered * prob);
  }

  simVirusMorbidity(prob) {
    for (var i = 0; i < this.incubated.length; i++) {
      this.incubated[i] -=  Math.round(this.incubated[i] * prob);
    }
    for (var i = 0; i < this.infected.length; i++) {
      this.infected[i] -=  Math.round(this.infected[i] * prob);
    }
  }

  simBirths(prob) {
    var newBorns = Math.round(this.populationCount * prob);
    if(this.populationCount + newBorns > this.populationLimit) {
      newBorns = 0;
    }
    this.susceptible += newBorns;
  }

  simInfections(prob, incPeriod, index, immigrants){
    var immigrantsInf = 0;
    var immigrantsSus = 0;
    for (var i = 0; i < immigrants.length; i++){
      if (immigrants[i].neigh == index){
        immigrantsInf += immigrants[i].infPop;
        immigrantsSus += immigrants[i].susPop;
      }
    }

    if (this.populationCount > 0){
      //Calc infection prob
      var percentageInfected = ((this.infectedCount + immigrantsInf) - this.infAway)
                              / ((this.populationCount + immigrantsSus) - this.susAway);
      var prob_q = 1 - Math.exp(-prob * percentageInfected);
      var infectionProb = randomizeProbWithNormalDistribution(prob_q, 0.5);

      //Add newly infected
      var newIncubated = Math.round(this.susceptible * infectionProb);
      this.incubated.push(newIncubated);
      this.susceptible -= newIncubated;
      if (this.susceptible < 0){
        this.susceptible = 0;
      }
      //check if incubated turns into infectious
      if (this.incubated.length >= incPeriod){
        var newInfected = this.incubated[0];
        this.infected.push(newInfected);
        this.incubated.shift();
      }else{
        this.infected.push(0);
      }

      //Sim immigrants becoming infected
      for (var i = 0; i < immigrants.length; i++){
        if (immigrants[i].neigh == index){
          newIncubated = Math.round(immigrants[i].susPop * infectionProb);
          immigrants[i].newInf += newIncubated;
        }
      }
    }
    return immigrants;
  }

  simRecoveries(infLength) {
    if (this.infected.length == infLength){
      var newRecovered = this.infected[0];
      this.infected.shift();
      this.recovered += newRecovered;
    }
  }
}

// # Grid class
// It represents grid of cells.
class Grid {
  constructor() {
    this.rows = 36;
    this.cols = 36;
    this.cellsCount = this.rowsCount * this.colsCount;
    this.cells = new Array(this.cellsCount);
    this.populationCount = 0;
    this.susceptibleCount = 0;
    this.incubatedCount = 0;
    this.infectedCount = 0;
    this.recoveredCount = 0;
    this.nearestCities = [];
    this.immigrants = [];
    // Assign pop to each cell
    for(var i = 0; i < this.cellsCount; i++) {
      this.cells[i] = new Cell(cellsPopulation[i], cellsPopulation[i] * 2.5);
    }

    //find nearest city over population 50000 for every cell
    for (var i = 0; i < this.cellsCount; i++){
      this.nearestCities.push(this.findClosestBigCity(i));
    }
  }

  get rowsCount(){return this.rows;}
  get colsCount(){return this.cols;}
  get getCells(){return this.cells;}
  get populationOverallCount(){return this.populationCount;}
  get infectedOverallCount(){return this.infectedCount;}
  get incubatedOverallCount(){return this.incubatedCount;}
  get recoveredOverallCount(){return this.recoveredCount;}
  get susceptibleOverallCount(){return this.susceptibleCount;}

  updateOverallCount(){
    //reset counts
    this.populationCount = 0;
    this.incubatedCount = 0;
    this.infectedCount = 0;
    this.recoveredCount = 0;
    for (var i = 0; i < this.cells.length; i++){
      this.populationCount += this.cells[i].populationCount;
      this.incubatedCount += this.cells[i].incubatedCount;
      this.infectedCount += this.cells[i].infectedCount;
      this.recoveredCount += this.cells[i].recoveredCount;
    }
  }

  getNeighbours(index){
    var neighbours = [];
    var possibleUp, possibleDown, possibleLeft, possibleRight;
    if (index / this.colsCount >= 1) {
      neighbours.push(index - this.colsCount); // up
      possibleUp = true;
    }
    if (index % this.colsCount != this.colsCount - 1) {
      neighbours.push(index + 1); // right
      possibleRight = true;
    }
    if (Math.floor(index / this.rowsCount) < this.rowsCount - 1) {
      neighbours.push(index + this.colsCount); // down
      possibleDown = true;
    }
    if (index % this.colsCount != 0) {
      neighbours.push(index - 1); //left
      possibleLeft = true;
    }
    // Moore neighbourhood
    if (possibleUp && possibleRight) {
      neighbours.push(index - this.colsCount + 1);
    }
    if (possibleUp && possibleLeft) {
      neighbours.push(index - this.colsCount - 1);
    }
    if (possibleDown && possibleRight) {
      neighbours.push(index + this.colsCount + 1);
    }
    if (possibleDown && possibleLeft) {
      neighbours.push(index + this.colsCount - 1);
    }

    return neighbours;
  }

  findClosestBigCity(index){
    if (this.cells[index].populationCount >= 50000){
      //return if cell is itself a big city
      return index
    }else{
      var bigCities = [];
      var twoD = get2D(this.cells);
      var row;

      //find big cities
      for (var i = 0; i < twoD.length; i++){
        row = twoD[i];
        for (var j = 0; j < row.length; j++){
          if(row[j].populationCount >= 50000){
            bigCities.push([j,i]);
          }
        }
      }
      //find XY of current cell
      var xy = [];
      for (var i = 0; i < twoD.length; i++){
        row = twoD[i];
        for (var j = 0; j < row.length; j++){
          if(row[j] == this.cells[index]){
            xy.push(j);//x
            xy.push(i);//y
          }
        }
      }

      //Find closest big city
      var x;
      var y;
      var smallest = 1000;//large num to be replaced by smaller distance
      var smallestIndex;
      var distance;
      for (var i = 0; i < bigCities.length; i++){
        x = (bigCities[i])[0];
        y = (bigCities[i])[1];
        //pythagoras to find out distance between cells given x1,x2,y1,y2
        distance = Math.sqrt( (x - xy[0])*(x - xy[0]) + (y - xy[1])*(y - xy[1]) )
        if (distance < smallest){
          smallest = distance;
          smallestIndex = [x,y];
        }
      }
      if (smallestIndex == undefined){
        return 551;
      }else{
        var closestIndex = ((smallestIndex[1]*40)-40) + smallestIndex[0];
        return closestIndex;
      }
    }
  }

  simImmigrations(config){
    for (var i = 0; i < this.cells.length; i++){
      var neighbours = this.getNeighbours(i);
      neighbours.push(this.nearestCities[i])
      //equal amount go to all neighbours and big city
      //No need to move rec/inc as they cant infected/be infected so makes no difference if they are simulated
      var toMoveArray = this.cells[i].getImmigrants(config.immigrationRate, config.illImmigrationRate );
      var toMoveInf = Math.round(toMoveArray[0]);
      var toMoveSus = Math.round(toMoveArray[1]);
      //add devide by neighbours.length
      for(var j = 0; j < neighbours.length; j++) {
        if (j == (neighbours.length-1)){
          toMoveInf *= 0.23; //big city rate
          toMoveSus *= 0.23;
        }
        //store immigrants origin and current location for move back later
        var immigrant = {
          origin: i,
          neigh: neighbours[j],
          susPop: toMoveSus,
          infPop: toMoveInf,
          newInf: 0
        }
        this.immigrants.push(immigrant);
      }
    }
  }

  simReturnImmigrations() {
    var totalNewInf = 0;
    for (var i = 0; i < this.immigrants.length; i++){
      totalNewInf += this.immigrants[i].newInf;
    }

    var imm;
    for (var i = 0; i < this.immigrants.length; i++){
      imm = this.immigrants[i];
      (this.cells[imm.origin]).returnImmigrants(imm.newInf);
    }
    this.immigrants = [];
  }

  resetCells() {
    this.cells = new Array(this.cellsCount);
    for(var i = 0; i < this.cellsCount; i++) {
      this.cells[i] = new Cell(cellsPopulation[i], cellsPopulation[i] * 2.5);
    }

    //find nearest city over population 50000 for every cell
    for (var i = 0; i < this.cellsCount; i++){
      this.nearestCities.push(this.findClosestBigCity(i));
    }
    this.updateOverallCount();
  }

  setAsInfected(index) {
    this.cells[index].addInfected(1000);
    this.updateOverallCount();
  }

  next(config) {
    this.simImmigrations(config);
    // Simulates natural deaths, deaths caused by the virus and new births.
    for(var i = 0; i < this.cellsCount; i++) {
      this.cells[i].simNaturalDeaths(config.naturalDeathRate);
      this.cells[i].simVirusMorbidity(config.virusMorbidity);
      this.cells[i].simBirths(config.birthRate);
      //percentage of population infected used as a probability
      //var limitContactRate = cells[i].infectedCount / cells[i].populationCount;
      //var contactRate = limitContactRate * config.contactInfectionRate
      this.immigrants = this.cells[i].simInfections(config.contactInfectionRate, config.incPeriod, i, this.immigrants);
    }

    this.simReturnImmigrations();
    for(var i = 0; i < this.cellsCount; i++) {
      this.cells[i].simRecoveries(config.infPeriod);
    }
    this.updateOverallCount();
  }
}

// # Picture class
// Shows map of Poland, gather mouse clicks.
class Picture {
  constructor(cols, rows) {
    this.colsCount = cols;
    this.rowsCount = rows;
    this.cellsCount = cols * rows;
    this.canvas = document.getElementById('picture');
    this.ctx = this.canvas.getContext('2d');
    this.canvasWidth = this.canvas.width;
    this.canvasHeight = this.canvas.height;
    this.sizeX = this.canvas.width/this.colsCount;
    this.sizeY = this.canvas.width/this.colsCount;
  }

  getCellPosition(pageX, pageY) {
    var x = (pageX - this.canvas.offsetLeft);
    var y = (pageY - this.canvas.offsetTop);
    var col = Math.floor(x/this.sizeX);
    var row = Math.floor(y/this.sizeY);
    var index = col + row * this.colsCount;
    return {
      index: index,
      col: col,
      row: row
    };
  }

  updateWithNewData(cells) {
    for(var i = 0; i < this.cellsCount; i++) {
      if (cells[i].populationLimit > 0) {
        var totalInfected = cells[i].infectedCount + cells[i].incubatedCount;
        var percentage = totalInfected / cells[i].populationCount;
        this.ctx.fillStyle = "rgba(255,0,0," + (percentage) + ")";
        this.ctx.clearRect((i % this.rowsCount) * this.sizeX, Math.floor(i / this.rowsCount) *
                      this.sizeY, this.sizeX, this.sizeY);
        this.ctx.fillRect((i % this.rowsCount) * this.sizeX, Math.floor(i / this.rowsCount) *
                     this.sizeY, this.sizeX, this.sizeY);
      }else{
        this.ctx.fillStyle = "rgba(0,0,0,0)";
        this.ctx.clearRect((i % this.rowsCount) * this.sizeX, Math.floor(i / this.rowsCount) *
                      this.sizeY, this.sizeX, this.sizeY);
        this.ctx.fillRect((i % this.rowsCount) * this.sizeX, Math.floor(i / this.rowsCount) *
                     this.sizeY, this.sizeX, this.sizeY);
      }
    }
  }

  getClickedCellPosition(event) {
    return this.getCellPosition(event.pageX, event.pageY);
  }

  setAsInfected(index, col, row) {
    if (cellsPopulation[index] != 0) {
      this.ctx.fillStyle = "rgba(255,0,0,100)";
      this.ctx.fillRect(row * this.sizeX, col * this.sizeY, this.sizeX, this.sizeY);
    }
  }
}

// # Configuration class
function Configuration() {
  var params = ["immigrationRate", "birthRate", "naturalDeathRate",
    "virusMorbidity", "incPeriod", "contactInfectionRate",
    "infPeriod", "illImmigrationRate"];

  // Generate getters and setters
  for(id in params) {
    var param = params[id];
    this[param] = function() {
      return this[param];
    };
    // Create a setter that checks whether 'val' is in the interval [0,1]
    this[param] = function(val) {
      if (val > 1) {
        val = 1;
      } else if (val < 0) {
        val = 0;
      }
      this[param] = val;
    };
  }

  //[1"immigrationRate", 2"birthRate", 3"naturalDeathRate",
  //  4"virusMorbidity", 5"incubationPeriod", 6"contactInfectionRate",
  //  7"infectiousPeriod", 8"illimmigrationRate"];
  // Loads predefined settings for few diseases.
  this.loadPredefinedSettings = function(id) {
    var values;
    if (id == 1) {
      // covid
      values = [0.055, 0.0001, 0.0001, 0.015, 3, 0.45, 9, 0.015];
    } else if(id == 2) {
      // influenza
      values = [0.055, 0.0001, 0.0001, 0.000043, 2, 0.45, 4, 0.015];
    }
    for(var id in params) {
      var param = params[id];
      this[param] = values[id];
    }
    this.pushSettingsToForm();
  }

  // Loads settings entered by the user in the form.
  this.loadSettingsFromForm = function() {
    for (var id in params) {
      var param = params[id];
      var paramVal = document.getElementById(param).value;
      this[param] = parseFloat(paramVal);
    }
  }

  // Updates user-facing form with new values. It's used e.g. after loading one
  // of the default diseases.
  this.pushSettingsToForm = function() {
    for (var id in params) {
      var param = params[id];
      document.getElementById(param).value = (this[param]);
    }
  }

  // constructor
  this.loadPredefinedSettings(1);
};

// # Epidemic class
function Epidemic(_config, _grid, _picture) {
  var config = _config;
  var grid = _grid;
  var picture = _picture;
  var iterationNumber = 0;
  var running = false;
  var infData = [];
  var incData = [];
  var recData = [];
  var dayData = [];
  var inf100 = [];
  var day100 = [];
  var avgComplete = false;
  var repeat = false;
  var repeatCount = 0;

  //init infected graph using chart.js on webpage
  var ctx = document.getElementById("infGraph").getContext('2d');
  var chart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Infected',
            borderColor: 'rgb(241, 30, 30)',
            data: []
        }]
    },
    options: {
            legend: { labels: {fontColor: "white"}},
            scales: {
                yAxes: [{
                    ticks: {
                        fontColor: "white",
                        beginAtZero: true
                    }
                }],
                xAxes: [{
                    ticks: {
                        fontColor: "white",
                        beginAtZero: true
                    }
                }]
            }
      }
  });

  //init incubated graph on webpage
  var ctx2 = document.getElementById("incGraph").getContext('2d');
  var chart2 = new Chart(ctx2, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Incubated',
            borderColor: 'rgb(246, 158, 35)',
            data: []
        }]
    },
    options: {
            legend: { labels: {fontColor: "white"}},
            scales: {
                yAxes: [{
                    ticks: {
                        fontColor: "white",
                        beginAtZero: true
                    }
                }],
                xAxes: [{
                    ticks: {
                        fontColor: "white",
                        beginAtZero: true
                    }
                }]
            }
      }
  });

  //init recovered graph on webpage
  var ctx3 = document.getElementById("recGraph").getContext('2d');
  var chart3 = new Chart(ctx3, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Recovered',
            borderColor: 'rgb(0, 153, 255)',
            data: []
        }]
    },
    options: {
            legend: { labels: {fontColor: "white"}},
            scales: {
                yAxes: [{
                    ticks: {
                        fontColor: "white",
                        beginAtZero: true
                    }
                }],
                xAxes: [{
                    ticks: {
                        fontColor: "white",
                        beginAtZero: true
                    }
                }]
            }
      }
  });

  //intialise grid on webpage
  this.init = function() {
    picture.updateWithNewData(grid.cells);
  }

  //run simulation
  this.run = function() {
    running = true
    var that = this;
    this.interval = setInterval(function() { that.nextStep()}, 60 );
  }

  // Show current stats (day, population, infected) under the map.
  this.showStats = function() {
    var pop = Math.round(grid.populationOverallCount/10000)/100;
    var inc = Math.round(grid.incubatedOverallCount/10000)/100;
    var inf = Math.round(grid.infectedOverallCount/10000)/100;
    var rec = Math.round(grid.recoveredOverallCount/10000)/100;
    var dayArea = document.getElementById("day");
    var popArea = document.getElementById("pop");
    var incArea = document.getElementById("incubated")
    var infArea = document.getElementById("infected");
    var recArea = document.getElementById("recovered");
    dayArea.innerHTML = ("<p><b>Day:</b> " + iterationNumber + "</p>");
    popArea.innerHTML = ("<p><b>Population:</b> " + pop + "M" + "</p>");
    incArea.innerHTML = ("<p><b>Incubated:</b> " + inc + "M" + "</p>");
    infArea.innerHTML = ("<p><b>Infected:</b> " + inf + "M" + "</p>");
    recArea.innerHTML = ("<p><b>Recovered:</b> " + rec + "M" + "</p>");
    //Append data to graph dataset
    dayData.push(iterationNumber);
    infData.push(inf);
    incData.push(inc);
    recData.push(rec);
    //Draw graphs
    this.drawInfGraph(dayData, infData, "Infected");
    this.drawIncGraph(dayData, incData, "Incubated");
    this.drawRecGraph(dayData, recData, "Recovered");
    //check if simulation is finished
    if ((iterationNumber > 1) && ((inf+inc) == 0)){
      this.finished();
    }
  }

  //Performs next step of the simulation.
  this.nextStep = function() {
    grid.next(config);
    picture.updateWithNewData(grid.cells);
    iterationNumber++;
    this.showStats();
  }

  //draw infected graph
  this.drawInfGraph = function(labels, data, dataLabel) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.data.datasets[0].label = dataLabel;
    chart.update();
  }

  //draw incubated graph
  this.drawIncGraph = function(labels, data, dataLabel) {
    chart2.data.labels = labels;
    chart2.data.datasets[0].data = data;
    chart2.data.datasets[0].label = dataLabel;
    chart2.update();
  }

  //Draw recovered graph
  this.drawRecGraph = function(labels, data, dataLabel) {
    chart3.data.labels = labels;
    chart3.data.datasets[0].data = data;
    chart3.data.datasets[0].label = dataLabel;
    chart3.update();
  }

  //When total infected/incubated reaches 0, stop simulation.
  this.finished = function() {
    grid.resetCells();
    picture.updateWithNewData(grid.cells);
    this.pause();
    //check if user is running repeating simulations
    if (repeat == true){
      inf100.push(infData);
      day100.push(dayData);
      this.run100();
    }
  }

  //Pause simulation
  this.pause = function() {
    running = false;
    clearInterval(this.interval);
  }

  // This method is called when user clicks on the map.
  this.infectedUpdated = function(event) {
    var pos = picture.getClickedCellPosition(event);
    grid.setAsInfected(pos.index);
    picture.setAsInfected(pos.index, pos.row, pos.col);
    this.showStats();
  }

  this.defaultInfected = function() {
    grid.setAsInfected(290);
    grid.setAsInfected(400);
    grid.setAsInfected(601);
    grid.setAsInfected(820);
    grid.setAsInfected(1169);
  }

  //iteratively call this function until 100 runs have been done
  //then draw results of the averages from the 100 runs
  this.run100 = function() {
    if (repeatCount == 100){
      //identify max length of days out of all simulations
      var longest = 0;
      var longestIndex;
      for (var i = 0; i < day100.length; i++){
        if (day100[i].length > longest){
          longest = day100[i].length;
          longestIndex = i;
        }
      }
      //get average of all days
      var avgInf = [];
      var dayAverage;
      for (var i = 0; i < longest; i++){
        dayAverage = 0;
        for (var j = 0; j < inf100.length; j++){
          if ((inf100[j][i]) != undefined){
            dayAverage += inf100[j][i];
          }
        }
        //round to 2 decimal places and append
        avgInf.push(Math.round(dayAverage/(inf100.length) * 100)/100);
      }
      //update graph with averages
      this.drawInfGraph(day100[longestIndex], avgInf, "Avg-Infected");
      //Reset vars
      repeat = false;
      repeatCount = 0;
      day100 = [];
      inf100 = [];
    }else{
      repeat = true;
      repeatCount++;
      this.restart();
      this.defaultInfected();
      this.run();
    }
  }

  //Restart simulation
  this.restart = function() {
    grid.resetCells();
    iterationNumber = 0;
    this.init();
    this.showStats();
    dayData = [];
    infData = [];
    recData = [];
    incData = [];
  }

  this.init();
}

window.onload = () => {
  var config = new Configuration();
  var grid = new Grid();
  var picture = new Picture(grid.colsCount, grid.rowsCount);
  var epidemic = new Epidemic(config, grid, picture);
  epidemic.showStats();

  // Event listeners
  var startButton = document.getElementById("start");
  var startDefButton = document.getElementById("startDef");
  var pauseButton = document.getElementById("pause");
  var oneStepButton = document.getElementById("oneStep");
  var restartButton = document.getElementById("restart");
  var picture = document.getElementById("picture");
  var selectedVirus = document.getElementById("defaultEpidemics");
  var settingButton = document.getElementById("configuration");
  var run100 = document.getElementById("run100");

  startButton.addEventListener('click', startPress);
  startDefButton.addEventListener('click', startDefPress);
  pauseButton.addEventListener('click', pausePress);
  oneStepButton.addEventListener('click', stepPress);
  restartButton.addEventListener('click', restartPress);
  picture.addEventListener('click', picturePress);
  selectedVirus.addEventListener('change', virusPress);
  settingButton.addEventListener('change', settingPress);
  run100.addEventListener('click', run100Press);

  //Event listener functions
  function startPress(e){
    e.preventDefault();
    epidemic.run();
  };
  function startDefPress(e){
    e.preventDefault();
    epidemic.defaultInfected();
    epidemic.run();
  };
  function pausePress(e) {
    e.preventDefault();
    epidemic.pause();
  };
  function stepPress(e) {
    e.preventDefault();
    epidemic.nextStep();
  };
  function restartPress(e) {
    e.preventDefault();
    var val = document.querySelector('input[name="providedEpidemics"]:checked').value;
    config.loadPredefinedSettings(val);
    epidemic.restart();
    epidemic.pause();
  };
  function picturePress(e){
    epidemic.infectedUpdated(e);
  }
  function virusPress(e){
    var val = document.querySelector('input[name="providedEpidemics"]:checked').value;
    config.loadPredefinedSettings(val);
  }
  function settingPress(e){
    config.loadSettingsFromForm();
  }
  function run100Press(e){
    epidemic.run100();
  }
}
