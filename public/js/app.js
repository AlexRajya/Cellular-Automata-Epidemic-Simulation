//Convert array of cells into 2D array
function get2D(cells) {
  var temp = [];
  var twoD = [];
  for (var i = 0; i < cells.length; i++){
    temp.push(cells[i]);
    if (temp.length == 36){
      twoD.push(temp);
      temp = [];
    }
  }
  return twoD;
}

//Cell class
//This class represents one cell in the grid.
class Cell {
  constructor(population, populationLimit, index) {
    this.populationLimit = populationLimit;
    this.susceptible = population;
    this.incubated = [];//This array represents a queue
    this.infected = [];//This array represents a queue
    this.recovered = 0;
    this.susAway = 0;
    this.infAway = 0;
    this.index_ = index;
  }

  get populationCount() { //Return overall population count
    return Math.round(this.incubatedCount + this.infectedCount +
      this.recovered + this.susceptible - this.susAway - this.infAway);
  }

  get infectedCount() {return Math.round((this.infected).reduce((a, b) => a + b, 0));}
  get incubatedCount() {return Math.round((this.incubated).reduce((a, b) => a + b, 0));}
  get susceptibleCount() {return this.susceptible;}
  get recoveredCount() {return Math.round(this.recovered);}
  get index() {return this.index_;}

  addInfected(val) {
    this.infected.push(val);//Add to infected queue
  }

  getImmigrants(immigrationRate, illImmigrationRate) {
    var toMoveInf = this.infectedCount * illImmigrationRate;
    this.infAway = toMoveInf;

    var toMoveSus = this.susceptible * immigrationRate;
    this.susAway = toMoveSus;

    return [toMoveInf, toMoveSus];
  }

  returnImmigrants(newInf){ //Simulate immigrants returning to origin cell
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

  simNaturalDeaths(prob) { //Simulate natural deaths
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

  simVirusMorbidity(prob) { //Simulate deaths caused by virus
    for (var i = 0; i < this.incubated.length; i++) {
      for (var j  = 0; i < ageMort.length; i++){
        this.incubated[i] -= Math.round(this.incubated[i]*ageDist[j]*ageMort[j]);
      }
    }
    for (var i = 0; i < this.infected.length; i++) {
      this.infected[i] -=  Math.round(this.infected[i] * prob);
    }
  }

  simBirths(prob) { //Simulate natural births
    var newBorns = Math.round(this.populationCount * prob);
    if(this.populationCount + newBorns > this.populationLimit) {
      newBorns = 0;
    }
    this.susceptible += newBorns;
  }

  simInfections(prob, incPeriod, index, immigrants){ //Sim new infections
    //Get counts from immigrants
    var immigrantsInf = 0;
    var immigrantsSus = 0;
    for (var i = 0; i < immigrants.length; i++){
      if (immigrants[i].neigh == index){
        immigrantsInf += immigrants[i].infPop;
        immigrantsSus += immigrants[i].susPop;
      }
    }
    var immigrantsPop = immigrantsInf+immigrantsSus;

    if (this.populationCount > 0){
      //Calc infection prob using total inf + immigrants
      var percentageInfected = ((this.infectedCount + immigrantsInf) - this.infAway)
                              / ((this.populationCount + immigrantsPop) - this.susAway - this.infAway);

      var infectionProb = prob * percentageInfected;

      //Add newly infected
      var newIncubated = Math.round(this.susceptible * infectionProb);
      this.incubated.push(newIncubated);
      this.susceptible -= newIncubated;
      if (this.susceptible < 0){
        this.susceptible = 0;
      }
      //check if any incubated turns into infectious based on length of queue
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

  simRecoveries(infLength) { //Simulate recovering from virus
    if (this.infected.length == infLength){
      var newRecovered = this.infected[0];
      this.infected.shift();
      this.recovered += newRecovered;
    }
  }
}

//Grid class
//It represents grid of cells.
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
    this.largeCities = [];
    // Assign population to each cell
    for(var i = 0; i < this.cellsCount; i++) {
      this.cells[i] = new Cell(cellsPopulation[i], cellsPopulation[i] * 2.5, i);
    }

    //find nearest city over population 50000 for every cell
    for (var i = 0; i < this.cellsCount; i++){
      this.nearestCities.push(this.findClosestBigCity(i));
    }

    //find all large Cities
    for (var i = 0; i < this.cellsCount; i++){
      if (this.cells[i].populationCount >= 50000){
        this.largeCities.push(i);
      }
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

  updateOverallCount(){//Get total count from all cells
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

  getNeighbours(index){//Find neighbours of cell at index
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
    // Moore neighbourhood (diagonals)
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
    //check if neighbours have population
    var populatedNeighbours = [];
    for (var i = 0; i < neighbours.length; i++){
      if (this.cells[neighbours[i]].populationCount > 0){
        populatedNeighbours.push(neighbours[i]);
      }
    }
    return populatedNeighbours;
  }

  findClosestBigCity(index){//Find closest city of pop > 50000 to cell at index
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
      var smallest = 10000;//large num to be replaced by smaller distance
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
      return twoD[smallestIndex[1]][smallestIndex[0]].index;
    }
  }

  simImmigrations(config){ //Sim immigrations to neighbouring cells/Large cities
    var randomCells = [];
    for (var i = 0; i < 25; i++){
      var random = Math.floor(Math.random() * (1296 - 0 + 1) + 0);
      randomCells.push(random);
    }
    for (var i = 0; i < this.cells.length; i++){
      if (this.cells[i].populationCount > 0){
        var neighbours = this.getNeighbours(i);
        //nearest big city for cell at index I
        neighbours.push(this.nearestCities[i]);

        //random big city
        if (randomCells.includes(i)){
          var random = Math.floor(Math.random() * ((this.largeCities.length) - 0 + 1) + 0);
          neighbours.push(this.largeCities[random]);
        };

        //equal amount go to all neighbours and big city/random city
        //No need to move rec/inc as they cant infected/be infected so makes no difference if they are simulated
        var toMoveArray = this.cells[i].getImmigrants(config.immigrationRate, config.illImmigrationRate);
        var toMoveInf = Math.round(toMoveArray[0] / neighbours.length);
        var toMoveSus = Math.round(toMoveArray[1] / neighbours.length);
        //add devide by neighbours.length
        for(var j = 0; j < neighbours.length; j++) {
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
  }

  simReturnImmigrations() { //Return immigrants to original cells
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

  resetCells() { //Reset grid
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

  setAsInfected(index) { //Add infected to user clicked cell
    this.cells[index].addInfected(this.cells[index].populationCount / 10);
    this.updateOverallCount();
  }

  next(config) { //Step the simulation forward (1 day)
    this.simImmigrations(config);
    // Simulates natural deaths, deaths caused by the virus and new births.
    for(var i = 0; i < this.cellsCount; i++) {
      this.cells[i].simNaturalDeaths(config.naturalDeathRate);
      this.cells[i].simVirusMorbidity(config.virusMorbidity);
      this.cells[i].simBirths(config.birthRate);
      //update immigrants list with updated infectious/recovered immigrants
      this.immigrants = this.cells[i].simInfections(config.contactInfectionRate, config.incPeriod, i, this.immigrants);
    }

    //return immigrants to original cells
    this.simReturnImmigrations();
    for(var i = 0; i < this.cellsCount; i++) {
      this.cells[i].simRecoveries(config.infPeriod);
    }
    this.updateOverallCount();
  }
}

//Picture class
//Shows map of Poland, gather mouse clicks.
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

  updateWithNewData(cells) { //Assign colour to each cell based on % infected
    for(var i = 0; i < this.cellsCount; i++) {
      if (cells[i].populationLimit > 0) {
        var totalInfected = cells[i].infectedCount + cells[i].incubatedCount;
        var percentage = totalInfected / cells[i].populationCount;
        this.ctx.fillStyle = "rgba(255,0,0," + percentage + ")";
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

  getClickedCellPosition(event) { //Find which cell was clicked by user
    return this.getCellPosition(event.pageX, event.pageY);
  }

  setAsInfected(index, col, row) { //Set clicked cell as infected (red)
    if (cellsPopulation[index] != 0) {
      this.ctx.fillStyle = "rgba(255,0,0,100)";
      this.ctx.fillRect(row * this.sizeX, col * this.sizeY, this.sizeX, this.sizeY);
    }
  }
}

//Configuration class
class Configuration {
  constructor(){
    this.loadPredefinedSettings(1);
    this.pushSettingsToForm();
    this.params = ["immigrationRate", "birthRate", "naturalDeathRate",
    "virusMorbidity", "incPeriod", "contactInfectionRate",
    "infPeriod", "illImmigrationRate"];
  }

  get immigrationRate(){return this.immigrationRate_;}
  get birthRate(){return this.birthRate_;}
  get naturalDeathRate(){return this.naturalDeathRate_;}
  get virusMorbidity(){return this.virusMorbidity_;}
  get incPeriod(){return this.incPeriod_;}
  get contactInfectionRate(){return this.contactInfectionRate_;}
  get infPeriod(){return this.infPeriod_;}
  get illImmigrationRate(){return this.illImmigrationRate_;}

  loadPredefinedSettings(id){ //Load preset
    if (id == 1) { //COVID-19
      this.immigrationRate_ = 0.5;
      this.birthRate_ = 0.0001;
      this.naturalDeathRate_ = 0.0001;
      this.virusMorbidity_ = 0.00015;
      this.incPeriod_ = 3;
      this.contactInfectionRate_ = 0.4;
      this.infPeriod_ = 9;
      this.illImmigrationRate_ = 0.15;
    }else if (id == 2) { //Influenza
      this.immigrationRate_ = 0.5;
      this.birthRate_ = 0.0001;
      this.naturalDeathRate_ = 0.0001;
      this.virusMorbidity_ = 0.000043;
      this.incPeriod_ = 2;
      this.contactInfectionRate_ = 0.35;
      this.infPeriod_ = 4;
      this.illImmigrationRate_ = 0.15;
    }else if (id == 3) { //COVID-19 Lockdown
      this.immigrationRate_ = 0.05;
      this.birthRate_ = 0.0001;
      this.naturalDeathRate_ = 0.0001;
      this.virusMorbidity_ = 0.000043;
      this.incPeriod_ = 3;
      this.contactInfectionRate_ = 0.35;
      this.infPeriod_ = 9;
      this.illImmigrationRate_ = 0.01;
    }else if (id == 4) { //COVID-19 Masks
      this.immigrationRate_ = 0.5;
      this.birthRate_ = 0.0001;
      this.naturalDeathRate_ = 0.0001;
      this.virusMorbidity_ = 0.000043;
      this.incPeriod_ = 3;
      this.contactInfectionRate_ = 0.15;
      this.infPeriod_ = 9;
      this.illImmigrationRate_ = 0.15;
    }
  }

  loadSettingsFromForm() {
    this.immigrationRate_ = document.getElementById('immigrationRate').value;
    this.birthRate_ = document.getElementById('birthRate').value;
    this.naturalDeathRate_ = document.getElementById('naturalDeathRate').value;
    this.virusMorbidity_ = document.getElementById('virusMorbidity').value;
    this.incPeriod_ = document.getElementById('incPeriod').value;
    this.contactInfectionRate_ = document.getElementById('contactInfectionRate').value;
    this.infPeriod_ = document.getElementById('infPeriod').value;
    this.illImmigrationRate_ = document.getElementById('illImmigrationRate').value;
  }

  pushSettingsToForm() {
    document.getElementById('immigrationRate').value = this.immigrationRate_;
    document.getElementById('birthRate').value = this.birthRate_;
    document.getElementById('naturalDeathRate').value = this.naturalDeathRate_;
    document.getElementById('virusMorbidity').value = this.virusMorbidity_;
    document.getElementById('incPeriod').value = this.incPeriod_;
    document.getElementById('contactInfectionRate').value = this.contactInfectionRate_;
    document.getElementById('infPeriod').value = this.infPeriod_;
    document.getElementById('illImmigrationRate').value = this.illImmigrationRate_;
  }
}

//Epidemic class
class Epidemic {
  constructor(config, grid, picture){
    this.config = config;
    this.grid = grid;
    this.picture = picture;
    this.iterationNumber = 0;
    this.running = false;
    this.infData = []; //Store inf daily data in array
    this.incData = []; //Store inf daily data in array
    this.recData = []; //Store inf daily data in array
    this.dayData = []; //Store day numbers
    this.inf100 = []; //Store last 100 sim results for averages
    this.inc100 = []; //Store last 100 sim results for averages
    this.rec100 = []; //Store last 100 sim results for averages
    this.day100 = [];
    this.avgComplete = false;
    this.repeat = false;
    this.repeatCount = 0;

    picture.updateWithNewData(this.grid.cells);

    //init infected graph using chart.js on webpage
    this.ctx = document.getElementById("infGraph").getContext('2d');
    this.chart = new Chart(this.ctx, {
      type: 'line',
      data: {
          labels: [],
          datasets: [{label:'Infected',borderColor:'rgb(241, 30, 30)',data:[]}]
      },
      options: {
              legend: { labels: {fontColor: "white"}},
              scales: {
                  yAxes: [{ticks: {fontColor: "white",beginAtZero: true}}],
                  xAxes: [{ticks: {fontColor: "white",beginAtZero: true}}]
              }
        }
    });

    //init incubated graph on webpage
    this.ctx2 = document.getElementById("incGraph").getContext('2d');
    this.chart2 = new Chart(this.ctx2, {
      type: 'line',
      data: {
          labels: [],
          datasets: [{label:'Incubated',borderColor:'rgb(246, 158, 35)',data:[]}]
      },
      options: {
              legend: { labels: {fontColor: "white"}},
              scales: {
                  yAxes: [{ticks: {fontColor: "white",beginAtZero: true}}],
                  xAxes: [{ticks: {fontColor: "white",beginAtZero: true}}]
              }
        }
    });

    //init recovered graph on webpage
    this.ctx3 = document.getElementById("recGraph").getContext('2d');
    this.chart3 = new Chart(this.ctx3, {
      type: 'line',
      data: {
          labels: [],
          datasets: [{label:'Recovered',borderColor:'rgb(0, 153, 255)',data:[]}]
      },
      options: {
              legend: { labels: {fontColor: "white"}},
              scales: {
                  yAxes: [{ticks: {fontColor: "white",beginAtZero: true}}],
                  xAxes: [{ticks: {fontColor: "white",beginAtZero: true}}]
              }
        }
    });
  }

  run() { //Set interval to keep incrementing simulation until stopped
    this.running = true;
    var that = this;
    this.interval = setInterval(function() { that.nextStep()}, 100 );
  }

  showStats() { //Display total counts on webpage
    var pop = Math.round((this.grid.populationOverallCount)/10000)/100;
    var inc = Math.round(this.grid.incubatedOverallCount/10000)/100;
    var inf = Math.round(this.grid.infectedOverallCount/10000)/100;
    var rec = Math.round(this.grid.recoveredOverallCount/10000)/100;
    var dayArea = document.getElementById("day");
    var popArea = document.getElementById("pop");
    var incArea = document.getElementById("incubated")
    var infArea = document.getElementById("infected");
    var recArea = document.getElementById("recovered");
    dayArea.innerHTML = ("<p><b>Day:</b> " + this.iterationNumber + "</p>");
    popArea.innerHTML = ("<p><b>Population:</b> " + pop + "M" + "</p>");
    incArea.innerHTML = ("<p><b>Incubated:</b> " + inc + "M" + "</p>");
    infArea.innerHTML = ("<p><b>Infected:</b> " + inf + "M" + "</p>");
    recArea.innerHTML = ("<p><b>Recovered:</b> " + rec + "M" + "</p>");
    //Append data to graph dataset
    this.dayData.push(this.iterationNumber);
    this.infData.push(inf);
    this.incData.push(inc);
    this.recData.push(rec);
    //Draw graphs
    this.drawInfGraph(this.dayData, this.infData, "Infected");
    this.drawIncGraph(this.dayData, this.incData, "Incubated");
    this.drawRecGraph(this.dayData, this.recData, "Recovered");
    //check if simulation is finished
    if ((this.iterationNumber > 1) && ((inf+inc) == 0)){
      this.finished();
    }
  }

  nextStep() { //Increment simulation
    this.grid.next(this.config);
    this.picture.updateWithNewData(this.grid.cells);
    this.iterationNumber++;
    this.showStats();
  }

  drawInfGraph(labels, data, dataLabel) { //Update inf graph with new data
    this.chart.data.labels = labels;
    this.chart.data.datasets[0].data = data;
    this.chart.data.datasets[0].label = dataLabel;
    this.chart.update();
  }

  drawIncGraph(labels, data, dataLabel) { //Update inc graph with new data
    this.chart2.data.labels = labels;
    this.chart2.data.datasets[0].data = data;
    this.chart2.data.datasets[0].label = dataLabel;
    this.chart2.update();
  }

  drawRecGraph(labels, data, dataLabel) { //Update rec graph with new data
    this.chart3.data.labels = labels;
    this.chart3.data.datasets[0].data = data;
    this.chart3.data.datasets[0].label = dataLabel;
    this.chart3.update();
  }

  finished() { //Stop simulation when total inf+inc = 0
    this.grid.resetCells();
    this.picture.updateWithNewData(this.grid.cells);
    this.pause();
    //check if user is running repeating simulations
    if (this.repeat == true){
      this.inf100.push(this.infData);
      this.inc100.push(this.incData);
      this.rec100.push(this.recData);
      this.day100.push(this.dayData);
      this.run100(this.runAmount);
    }
  }

  pause() { //Pause simulation
    this.running = false;
    clearInterval(this.interval);
  }

  infectedUpdated(event) {
    var pos = this.picture.getClickedCellPosition(event);
    this.grid.setAsInfected(pos.index);
    this.picture.setAsInfected(pos.index, pos.row, pos.col);
    this.showStats();
  }

  randomInfected() { //Infect 10 random cells
    for (var i = 1; i < 10; i++){
      var temp = Math.floor(Math.random() * (1295 - 0 + 1) + 0);
      this.grid.setAsInfected(temp);
    }
  }
  //add param to set run time
  run100(runAmount) { //Run simulation 100 times then display averages on graph
    this.runAmount = runAmount;
    if (this.repeatCount == this.runAmount){
      //identify max length of days out of all simulations
      var longest = 0;
      var longestIndex;
      for (var i = 0; i < this.day100.length; i++){
        if (this.day100[i].length > longest){
          longest = this.day100[i].length;
          longestIndex = i;
        }
      }
      //get average of all days
      var avgInf = [];
      var avgInc = [];
      var avgRec = [];
      var dayAvgInf;
      var dayAvgInc;
      var dayAvgRec;

      //Calc average for each day
      for (var i = 0; i < longest; i++){
        dayAvgInf = 0;
        dayAvgInc = 0;
        dayAvgRec = 0;
        for (var j = 0; j < this.inf100.length; j++){
          if ((this.inf100[j][i]) != undefined){
            dayAvgInf += this.inf100[j][i];
          }
          if ((this.inc100[j][i]) != undefined){
            dayAvgInc += this.inc100[j][i];
          }
          if ((this.rec100[j][i]) != undefined){
            dayAvgRec += this.rec100[j][i];
          }
        }
        //round to 2 decimal places and append
        avgInf.push(Math.round(dayAvgInf/(this.inf100.length) * 100)/100);
        avgInc.push(Math.round(dayAvgInc/(this.inc100.length) * 100)/100);
        avgRec.push(Math.round(dayAvgRec/(this.rec100.length) * 100)/100);
      }
      //Give rec previous day's average val if rec for day X doesnt exist
      for (var i = 1; i < avgRec.length; i++){
        if (avgRec[i] < avgRec[i-1]){
          avgRec[i] = avgRec[i-1];
        }
      }
      //update graph with averages
      this.drawInfGraph(this.day100[longestIndex], avgInf, "Avg-Infected");
      this.drawIncGraph(this.day100[longestIndex], avgInc, "Avg-Incubated");
      this.drawRecGraph(this.day100[longestIndex], avgRec, "Avg-Recovered");
      //Send data to be stored locally
      var avgObj = {
        day: this.day100[longestIndex],
        inc: avgInc,
        inf: avgInf,
        rec: avgRec
      };
      const sendJSON = JSON.stringify(avgObj);

      var url = `${window.location.href}save`;
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
      xhr.send(sendJSON);
      //Reset vars
      this.repeat = false;
      this.repeatCount = 0;
      this.day100 = [];
      this.inf100 = [];
    }else{
      //run sim again
      this.repeat = true;
      this.repeatCount++;
      this.restart();
      this.randomInfected();
      this.run();
    }
  }

  restart() { //Restart simulation
    this.grid.resetCells();
    this.iterationNumber = 0;
    this.picture.updateWithNewData(this.grid.cells);
    this.showStats();
    this.dayData = [];
    this.infData = [];
    this.recData = [];
    this.incData = [];
  }
}

//init event handlers / classes
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
  var run10 = document.getElementById("run10");

  startButton.addEventListener('click', startPress);
  startDefButton.addEventListener('click', startDefPress);
  pauseButton.addEventListener('click', pausePress);
  oneStepButton.addEventListener('click', stepPress);
  restartButton.addEventListener('click', restartPress);
  picture.addEventListener('click', picturePress);
  selectedVirus.addEventListener('change', virusPress);
  settingButton.addEventListener('change', settingPress);
  run100.addEventListener('click', run100Press);
  run10.addEventListener('click', run10Press);

  //Event listener functions
  function startPress(e){
    e.preventDefault();
    epidemic.run();
  };
  function startDefPress(e){
    e.preventDefault();
    epidemic.randomInfected();
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
    config.pushSettingsToForm();
    epidemic.restart();
    epidemic.pause();
  };
  function picturePress(e){
    epidemic.infectedUpdated(e);
  }
  function virusPress(e){
    var val = document.querySelector('input[name="providedEpidemics"]:checked').value;
    config.loadPredefinedSettings(val);
    config.pushSettingsToForm();
  }
  function settingPress(e){
    config.loadSettingsFromForm();
    console.log("Custom settings loaded");
  }
  function run100Press(){
    epidemic.run100(100);
  }
  function run10Press(){
    epidemic.run100(10);
  }
}
