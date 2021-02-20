// Shuffles array
function shuffle(array) {
    var tmp, current, top = array.length;
    if(top) while(--top) {
      current = Math.floor(Math.random() * (top + 1));
      tmp = array[current];
      array[current] = array[top];
      array[top] = tmp;
    }
    return array;
}

function makeArrayOf(value, length) {
  var arr = [], i = length;
  while (i--) {
    arr[i] = value;
  }
  return arr;
}

function supports_html5_storage() {
  try {
    return 'localStorage' in window && window['localStorage'] !== null;
  } catch (e) {
    return false;
  }
}

function showAlert(msg) {
  $("#alertText").html(msg);
  $(".alert").show();
  setTimeout(function () {
    $(".alert").hide();
  }, 2000);
}

//# Cell class
// This class represents one cell in the grid.
// It contains three values:
//
// * population count
// * infected population count
// * population limit (limited e.g. by the number of houses or food
// availability)
function Cell(populationCount, infectedCount, populationLimit) {
  var populationCount = populationCount; //S
  var infectedCount = infectedCount; //I
  var recoveredCount = 0;  //R
  var populationLimit = populationLimit;
  var infectedQueue = [];

  this.__defineGetter__("populationCount", function(){
    return populationCount;
  });
  this.__defineSetter__("populationCount", function(val){
    populationCount = val;
  });
  this.__defineGetter__("infectedCount", function(){
    return infectedCount;
  });
  this.__defineSetter__("infectedCount", function(val){
    infectedCount = val;
  });
  this.__defineGetter__("populationLimit", function(){
    return populationLimit;
  });
  this.__defineSetter__("populationLimit", function(val){
    populationLimit = val;
  });
  this.__defineGetter__("recoveredCount", function(){
    return recoveredCount;
  });
  this.__defineSetter__("recoveredCount", function(val){
    recoveredCount = val;
  });

  // Simulates natural deaths with given probability.
  this.simNaturalDeaths = function(prob) {
    this.populationCount -= Math.round(this.populationCount * prob);
    this.infectedCount -= Math.round(this.infectedCount * prob);
  }

  // Simulates deaths caused by the virus (with given probability).
  //add age here
  this.simVirusMorbidity= function(prob) {
    if (Math.random() < prob) {
      var dead = Math.round(this.infectedCount / 5 * 4);
      this.populationCount -= dead;
      this.infectedCount -= dead;
    }
  }

  // Simulates new births with given probability.
  this.simBirths = function(prob) {
    var newborns = Math.round(this.populationCount * prob);
    if(this.populationCount + newborns > this.populationLimit) {
      newborns = this.populationLimit - this.populationCount;
    }
    this.populationCount += newborns;
  }

  // Simulates new infections (with given probability).
  this.simInfections = function(prob) {
    if (this.populationCount > 0) {
      var susceptible = this.populationCount - this.infectedCount - this.recoveredCount;
      if (susceptible < 0){
        susceptible = 0;
      }
      var infected = Math.round(susceptible * prob);
      this.infectedCount += infected;
      infectedQueue.push(infected);
    }
  }

  // Simulates recoveries (with given probability).
  this.simRecoveries = function(infLength) {
    if (infectedQueue.length == infLength){
      var recovered = infectedQueue[0];
      infectedQueue.shift();
      this.infectedCount -= recovered;
      //avoid negative infections
      if ((this.infectedCount < 0) || (infectedQueue.length == 0)){
        this.infectedCount = 0;
      }
      this.recoveredCount += recovered;
    }else if ((infectedQueue.length == 0) && (this.infectedCount > 0)){
      infectedQueue.push(this.infectedCount);
    }
  }
}

// # Grid class
// It represents grid of cells.
function Grid() {
  var rowsCount = 36;
  var colsCount = 36;
  var cellsCount = rowsCount * colsCount;
  var cells = new Array(cellsCount);
  var populationOverallCount = 0;
  var susceptibleOverallCount = 0;//S of SEIR
  var incubatedOverallCount = 0;//E of SEIR
  var infectedOverallCount = 0;//I of SEIR
  var recoveredOverallCount = 0;//R of SEIR
  var nearestCities = [];
  var immigrants = [];

  this.__defineGetter__("rowsCount", function(){
    return rowsCount;
  });
  this.__defineGetter__("colsCount", function(){
    return colsCount;
  });
  this.__defineGetter__("cells", function(){
    return cells;
  });
  this.__defineGetter__("populationOverallCount", function(){
    return populationOverallCount;
  });
  this.__defineGetter__("infectedOverallCount", function(){
    return infectedOverallCount;
  });
  this.__defineGetter__("incubatedOverallCount", function(){
    return incubatedOverallCount;
  });
  this.__defineGetter__("recoveredOverallCount", function(){
    return recoveredOverallCount;
  });
  this.__defineGetter__("susceptibleOverallCount", function(){
    return susceptibleOverallCount;
  });

  //Convert array of cells into 2D array
  this.get2D = function(cells) {
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
  // Updates counts of total population and infected people.
  this.updateOverallCount = function() {
    populationOverallCount = _.reduce(cells, function(memo, cell) {
      return memo + cell.populationCount;
    }, 0);
    infectedOverallCount = _.reduce(cells, function(memo, cell) {
      return memo + cell.infectedCount;
    }, 0);
    recoveredOverallCount = _.reduce(cells, function(memo, cell) {
      return memo + cell.recoveredCount;
    }, 0);
  };

  // Returns indices of neighbouring cells.
  this.getNeighbours = function(index) {
    var neighbours = [];
    var possibleUp, possibleDown, possibleLeft, possibleRight;
    if (index / colsCount >= 1) {
      neighbours.push(index - colsCount); // up
      possibleUp = true;
    }
    if (index % colsCount != colsCount - 1) {
      neighbours.push(index + 1); // right
      possibleRight = true;
    }
    if (Math.floor(index / rowsCount) < rowsCount - 1) {
      neighbours.push(index + colsCount); // down
      possibleDown = true;
    }
    if (index % colsCount != 0) {
      neighbours.push(index - 1); //left
      possibleLeft = true;
    }
    // Moore neighbourhood
    if (possibleUp && possibleRight) {
      neighbours.push(index - colsCount + 1);
    }
    if (possibleUp && possibleLeft) {
      neighbours.push(index - colsCount - 1);
    }
    if (possibleDown && possibleRight) {
      neighbours.push(index + colsCount + 1);
    }
    if (possibleDown && possibleLeft) {
      neighbours.push(index + colsCount - 1);
    }

    return neighbours;
  };

  this.findClosestBigCity = function(index) {
    if (cells[index].populationCount >= 50000){
      //return if cell is itself a big city
      return index
    }else{
      var bigCities = [];
      var twoD = this.get2D(cells);
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
          if(row[j] == cells[index]){
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
  };

  // Simulates immigrations.
  // Algorithm:
  //
  // 1. Select random cell
  // 2. Get its neighbours and nearest big city
  // 3. Calculate number of people (overall and infected) to emmigrate to one
  // neighbouring cell and nearest big city
  // 4. Move people to all neighbouring cell and big city
  // 5. Repeat for all cells
  this.simImmigrations = function(config){
    for (var i = 0; i < cells.length; i++){
      var neighbours = this.getNeighbours(i);
      //push nearest big city as a neighbour
      neighbours.push(nearestCities[i]);
      //equal amount go to all neighbours and big city
      var toMove = Math.round((config.immigrationRate * cells[i].populationCount) / neighbours.length);
      var toMoveInfected = Math.round((config.immigrationRate * cells[i].infectedCount) / neighbours.length);
      for(j = 0; j < neighbours.length; j++) {
        var neighCell = cells[neighbours[j]];
        if (neighCell.populationCount + toMove > neighCell.populationLimit) {
          toMove = neighCell.populationLimit - neighCell.populationCount;
          if (toMoveInfected > toMove) { toMoveInfected = toMove; }
        }
        //store immigrants origin and current location for move back later
        var immigrant = {
          origin: i,
          neigh: neighbours[j],
          moved: toMove,
          infMoved: toMoveInfected
        }
        immigrants.push(immigrant);

        //update populations with immigrants
        neighCell.populationCount += toMove;
        neighCell.infectedCount += toMoveInfected;
        cells[i].populationCount -= toMove;
        cells[i].infectedCount -= toMoveInfected;
      }
    }
  }

  //Return immigrants from function simImmigrations
  this.simReturnImmigrations = function(){
    var immigrant;
    for (var i = 0; i < immigrants.length; i++){
      immigrant = immigrants[i];
      (cells[immigrant.origin]).populationCount += immigrant.moved;
      (cells[immigrant.origin]).infectedCount += immigrant.infMoved;
      (cells[immigrant.neigh]).populationCount -= immigrant.moved;
      (cells[immigrant.neigh]).infectedCount -= immigrant.infMoved;
    }
    immigrants = [];
  }

  // Performs next step in the simulation.
  this.next = function(config) {
    this.simImmigrations(config);
    // Simulates natural deaths, deaths caused by the virus and new births.
    for(i = 0; i < cellsCount; i++) {
      var currCell = cells[i];
      currCell.simNaturalDeaths(config.naturalDeathRate);
      currCell.simVirusMorbidity(config.virusMorbidity);
      currCell.simBirths(config.birthRate);
    }
    // Simulates new contact and vectored infections. Then simulates recoveries.
    for(i = 0; i < cellsCount; i++) {
      var currCell = cells[i];
      var limitContactRate = currCell.infectedCount / currCell.populationCount;
      var contactRate = limitContactRate * config.contactInfectionRate
      currCell.simInfections(contactRate);
      currCell.simRecoveries(config.recoveryRate);
    }
    this.simReturnImmigrations();
    //config.updateRecoveryRate();
    this.updateOverallCount();
  }

  this.setAsInfected = function(index) {
    cells[index].infectedCount = cells[index].populationCount;
    this.updateOverallCount();
  }

  this.resetCells = function() {
    cells = new Array(cellsCount);
    this.init();
  }

  this.init = function() {
    // constructor
    var avg = 26000;
    for(i = 0; i < cellsCount; i++) {
      cells[i] = new Cell(avg, 0, avg * 2.5);
    }
    _.each(cellsPopulation, function(value, key) {
      cells[key].populationCount = value;
      cells[key].populationLimit = value * 2.5;
    }, this);
    this.updateOverallCount();

    //find nearest city over pop 50000 for every cell
    for (var i = 0; i < cells.length; i++){
      nearestCities.push(this.findClosestBigCity(i));
    }
  }
  this.init();
}

// # Picture class
// Shows map of Poland, gather mouse clicks.
function Picture(_cols, _rows) {
  var colsCount = _cols;
  var rowsCount = _rows;
  var cellsCount = colsCount * rowsCount;
  var canvas = document.getElementById('picture');
  var ctx = canvas.getContext('2d');
  var canvasWidth = canvas.width;
  var canvasHeight = canvas.height;
  var sizeX = canvas.width/colsCount;
  var sizeY = canvas.height/rowsCount;

  // Returns info about the cell that is under the provided position on the page.
  this.getCellPosition = function(pageX, pageY) {
    var x = (pageX - canvas.offsetLeft);
    var y = (pageY - canvas.offsetTop);
    var col = Math.floor(x/sizeX);
    var row = Math.floor(y/sizeY);
    var index = col + row * colsCount;
    return {
      index: index,
      col: col,
      row: row
    };
  }

  // Updates the map based on the current cells state.
  this.updateWithNewData = function(cells) {
    for(i = 0; i < cellsCount; i++) {
      if (cells[i].populationLimit > 0) {
        var percentage = cells[i].infectedCount / cells[i].populationCount;
        ctx.fillStyle = "rgba(255,0,0," + percentage + ")";
        ctx.clearRect((i % rowsCount) * sizeX, Math.floor(i / rowsCount) *
                      sizeY, sizeX, sizeY);
        ctx.fillRect((i % rowsCount) * sizeX, Math.floor(i / rowsCount) *
                     sizeY, sizeX, sizeY);
      }
    }
  }

  // Returns the info about the cell from the given onclick event.
  this.getClickedCellPosition = function(event) {
    return this.getCellPosition(event.pageX, event.pageY);
  }

  // Changes the color of the current cell to indicate that it's now infected.
  this.setAsInfected = function(index, col, row) {
    if (cellsPopulation[index] != 0) {
      ctx.fillStyle = "rgba(255,0,0,100)";
      ctx.fillRect(row * sizeX, col * sizeY, sizeX, sizeY);
    }
  }
}

// # Configuration class
function Configuration() {

  var params = ["immigrationRate", "birthRate", "naturalDeathRate",
    "virusMorbidity", "vectoredInfectionRate", "contactInfectionRate",
    "recoveryRate", "recoveryImprovement"];

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

  // Calculates new recovery rate if the recovery improvement is set.
  this.updateRecoveryRate = function() {
    this.recoveryRate *= 1 + this.recoveryImprovement;
    // Round to 4 decimals -- we have to do that, because form uses input type
    // number with 'step' set to 0.0001, and it is the best precision available.
    this.recoveryRate = Math.round(this.recoveryRate*10000)/10000
    if (this.recoveryRate > 1) {
      this.recoveryRate = 1;
    }
    var recoveryRateArea = document.getElementById("recoveryRate");
    recoveryRateArea.value = (this.recoveryRate);
  }

  //[1"immigrationRate", 2"birthRate", 3"naturalDeathRate",
  //  4"virusMorbidity", 5"vectoredInfectionRate", 6"contactInfectionRate",
  //  7"recoveryRate/infectous for x days", 8"recoveryImprovement"];
  // Loads predefined (provided by authors) settings for few diseases.
  this.loadPredefinedSettings = function(id) {
    var values;
    if (id == 1) {
      // influenza
      values = [0.2, 0.0001, 0.0001, 0.002, 0.3, 0.7, 17, 0.004];
    } else if(id == 2) {
      // smallpox
      values = [0.01, 0.0001, 0.0001, 0.005, 0.3, 0.6, 0.1, 0.01];
    } else if(id == 3) {
      // covid
      values = [0.01, 0.0001, 0.0001, 0.004, 0.3, 0.6, 0.05, 0.004];
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
      this[param] = parseFloat($("#" + param).val());
    }
  }

  // Updates user-facing form with new values. It's used e.g. after loading one
  // of the default diseases.
  this.pushSettingsToForm = function() {
    for (var id in params) {
      var param = params[id];
      $("#" + param).val(this[param]);
    }
  }

  // constructor
  this.loadPredefinedSettings(1);
};

// # Epidemic class
function Epidemic(_config, _grid, _picture) {
  this.init = function() {
    picture.updateWithNewData(grid.cells);
  }
  this.run = function() {
    running = true
    var that = this;
    this.interval = setInterval(function() { that.nextStep()}, 50 );
  }

  // Show current stats (day, population, infected) under the map.
  this.showStats = function() {
    var pop = Math.round(grid.populationOverallCount/10000)/100;
    var inf = Math.round(grid.infectedOverallCount/10000)/100;
    var rec = Math.round(grid.recoveredOverallCount/10000)/100;
    var dayArea = document.getElementById("day");
    var popArea = document.getElementById("pop");
    var infArea = document.getElementById("infected");
    var recArea = document.getElementById("recovered");
    dayArea.innerHTML = ("Day: " + iterationNumber);
    popArea.innerHTML = ("Population: " + pop + "M");
    infArea.innerHTML = ("Infected population: " + inf + "M");
    recArea.innerHTML = ("Recovered population: " + rec + "M");
  }

  // Generates next step of the simulation.
  this.nextStep = function() {
    grid.next(config);
    picture.updateWithNewData(grid.cells);
    iterationNumber++;
    this.showStats();
  }

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
    grid.setAsInfected(500);
    grid.setAsInfected(750);
  }

  this.restart = function() {
    grid.resetCells();
    iterationNumber = 0;
    this.init();
    this.showStats();
  }

  // constructor
  var config = _config;
  var grid = _grid;
  var picture = _picture;
  var iterationNumber = 0;
  var running = false;
  this.init();
}


window.onload = () => {
  var config = new Configuration();
  var grid = new Grid();
  var picture = new Picture(grid.colsCount, grid.rowsCount);

  var epidemic = new Epidemic(config, grid, picture);
  epidemic.showStats();

  // # Events.
  // ## Control buttons' events.
  var startButton = document.getElementById("start");
  var startDefButton = document.getElementById("startDef");
  var pauseButton = document.getElementById("pause");
  var oneStepButton = document.getElementById("oneStep");
  var restartButton = document.getElementById("restart");
  var picture = document.getElementById("picture");
  var selectedVirus = document.getElementById("defaultEpidemics")

  startButton.addEventListener('click', startPress);
  startDefButton.addEventListener('click', startDefPress);
  pauseButton.addEventListener('click', pausePress);
  oneStepButton.addEventListener('click', stepPress);
  restartButton.addEventListener('click', restartPress);
  picture.addEventListener('click', picturePress);
  selectedVirus.addEventListener('change', virusPress);
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
}