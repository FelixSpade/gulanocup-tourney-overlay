//TODO: remap variables from beatmap_data.json & check for maps not in mappool

window.addEventListener("contextmenu", (e) => e.preventDefault());

// START
let socket = new ReconnectingWebSocket("ws://127.0.0.1:24050/ws");
let axios = window.axios;
let user = {};

// NOW PLAYING
let mapContainer = document.getElementById("mapContainer");
let mapArtist = document.getElementById("mapName");
let mapInfo = document.getElementById("mapInfo");
let mapper = document.getElementById("mapper");
let stars = document.getElementById("stars");
let nowPlayingContainer = document.getElementById("nowPlayingContainer");
let stats = document.getElementById("stats");

// Chats
let chats = document.getElementById("chats");

// Avatar
let avaLeft = document.getElementById("avatarLeft");
let avaRight = document.getElementById("avatarRight");
let avaSet = 0;

// First Pick
let pickButtonR = document.getElementById("pickButtonR");
let pickButtonB = document.getElementById("pickButtonB");
let pickState = document.getElementById("pickState");

// Wildcard container layer
let pickerWC = document.getElementById("pickerWC");





const beatmaps = new Set(); // Store beatmapID;

socket.onopen = () => {
  console.log("Successfully Connected");
};

socket.onclose = (event) => {
  console.log("Socket Closed Connection: ", event);
  socket.send("Client Closed!");
};

socket.onerror = (error) => {
  console.log("Socket Error: ", error);
};

let tempUID;

let tempMapID, tempImg, tempMapArtist, tempMapTitle, tempMapDiff, tempMapper;

let tempSR, tempCS, tempAR, tempOD, tempHP;

let scoreLeftTemp, scoreRightTemp;
let teamNameLeftTemp, teamNameRightTemp;

let gameState;

let chatLen = 0;
let tempClass = "unknown";

let hasSetup = false;
let tempTempMapID;

let scoreLeft = [];
let scoreRight = [];

let tempLastPick = "Blue";

const mods = {
  RC: 0,
  LN: 1,
  HB: 2,
  SV: 3,
  WC: 4,
  TB: 5,
};

class Beatmap {
  constructor(mods, beatmapID, layerName) {
    this.mods = mods;
    this.beatmapID = beatmapID;
    this.layerName = layerName;
  }
  generate() {
    let mappoolContainer = document.getElementById(`${this.mods}`);

    this.clicker = document.createElement("div");
    this.clicker.id = `${this.layerName}-clicker`;

    mappoolContainer.appendChild(this.clicker);
    let clickerObj = document.getElementById(this.clicker.id);

    this.map = document.createElement("div");
    this.overlay = document.createElement("div");
    this.metadata = document.createElement("div");
    this.difficulty = document.createElement("div");
    this.modIcon = document.createElement("div");
    this.pickedStatus = document.createElement("div");
    this.protect = document.createElement("div");

    this.map.id = `${this.layerName}-BG`;
    this.overlay.id = `${this.layerName}-overlay`;
    this.protect.id = `${this.layerName}-protect`;
    this.metadata.id = `${this.layerName}-metadata`;
    this.difficulty.id = `${this.layerName}-difficulty`;
    this.modIcon.id = `${this.layerName}-modicon`;
    this.pickedStatus.id = `${this.layerName}-status`;

    this.metadata.setAttribute("class", "mapInfo");
    this.difficulty.setAttribute("class", "mapInfo");
    this.map.setAttribute("class", "map");
    this.pickedStatus.setAttribute("class", "pickingStatus");
    this.overlay.setAttribute("class", "overlay");
    this.protect.setAttribute("class", "protect");
    this.modIcon.setAttribute("class", "modIcon");
    this.modIcon.style.backgroundImage = `url("./static/${this.mods}.png")`;
    this.clicker.setAttribute("class", "clicker");
    clickerObj.appendChild(this.map);
    document.getElementById(this.map.id).appendChild(this.overlay);
    document.getElementById(this.map.id).appendChild(this.metadata);
    document.getElementById(this.map.id).appendChild(this.difficulty);
    document.getElementById(this.map.id).appendChild(this.protect);
    clickerObj.appendChild(this.pickedStatus);
    clickerObj.appendChild(this.modIcon);

    this.clicker.style.transform = "translateY(0)";
  }
  grayedOut() {
    this.overlay.style.opacity = "1";
  }
  PickedOn(type) {
    console.log(this)
    if(this.pickedStatus.className == `bannedBlue` || this.pickedStatus.className == `bannedRed` || this.pickedStatus.className == `banned`){
      return
    }else{
    this.pickedStatus.className = `picked${type}`;
    this.overlay.style.opacity = "0.5";
    this.metadata.style.opacity = "1";
  this.protect.style.opacity = this.protect.style.opacity;
    this.difficulty.style.opacity = "1";
    this.pickedStatus.innerHTML = "Picked";
  }

  
}
}

let bestOfTemp;
let scoreVisibleTemp;
let starsVisibleTemp;

let team1 = "Red",
  team2 = "Blue";

socket.onmessage = async (event) => {
  let data = JSON.parse(event.data);
  const leftTeamName = data.tourney.team?.left ?? "Red Team";
  const rightTeamName = data.tourney.team?.right ?? "Blue Team";

  if ((team1 !== leftTeamName && team2 !== rightTeamName) && (leftTeamName.length !== 0 && rightTeamName.length !== 0)) {
      team1 = leftTeamName;
      team2 = rightTeamName;
  }

  if (!hasSetup) setupBeatmaps();

  if (tempMapID !== data.menu.bm.id) {
    tempMapID = data.menu.bm.id;
    pickedOnManual(tempMapID);
  }

  if (teamNameLeftTemp !== leftTeamName) {
    teamNameLeftTemp = leftTeamName;
    pickButtonR.innerHTML = teamNameLeftTemp;
  }
  if (teamNameRightTemp !== rightTeamName) {
    teamNameRightTemp = rightTeamName;
    pickButtonB.innerHTML = teamNameRightTemp;
  }
};

pickButtonR.addEventListener("click", () => {
  pickState.innerHTML = "First Team to pick: " + pickButtonR.innerHTML;
  tempLastPick = "Blue";
});

pickButtonB.addEventListener("click", () => {
  pickState.innerHTML = "First Team to pick: " + pickButtonB.innerHTML;
  tempLastPick = "Red";
});

async function setupBeatmaps() {
  hasSetup = true;

  const modsCount = {
    RC: 0,
    LN: 0,
    HB: 0,
    SV: 0,
    WC: 0,
    TB: 0,
  };

  const bms = [];
  try {
    $.ajaxSetup({ cache: false });
    const jsonData = await $.getJSON(`beatmaps.json`);
    jsonData.map((beatmap) => {
      bms.push(beatmap);
    });

  } catch (error) {
    console.error("Could not read JSON file", error);
  }

  (function countMods() {
    bms.map((beatmap) => {
      modsCount[beatmap.mods]++;
    });
  })();

  let row = -1;
  let preMod = 0;
  let colIndex = 0;
  bms.map(async (beatmap, index) => {
    if (beatmap.mods !== preMod || colIndex % 3 === 0) {
      preMod = beatmap.mods;
      colIndex = 0;
      row++;
    }
    const bm = new Beatmap(
      beatmap.mods,
      beatmap.beatmapId,
      `id-${beatmap.beatmapId}`
    );
    bm.generate();
    bm.clicker.onmouseover = function () {
      bm.clicker.style.transform = "translateY(-5px)";
    };
    bm.clicker.onmouseleave = function () {
      bm.clicker.style.transform = "translateY(0px)";
    };
    // Add a 'mousedown' event listener
bm.clicker.addEventListener("mousedown", function (event) {
  // Handle 'shift' key without 'alt'
  if (event.shiftKey && !event.altKey) {
    bm.pickedStatus.className = "bannedRed";
    bm.overlay.style.opacity = "0.8";
    bm.metadata.style.opacity = "0.3";
    bm.protect.style.opacity = "0";
    bm.difficulty.style.opacity = "0.3";
    bm.pickedStatus.innerHTML = `Banned by ${team1}`;
  }
  // Handle 'ctrl' key
  else if (event.ctrlKey) {
    bm.overlay.style.opacity = "0.5";
    bm.metadata.style.opacity = "1";
    bm.difficulty.style.opacity = "1";
    bm.protect.style.opacity = "0";
    bm.pickedStatus.className = "pickedStatus";
    bm.pickedStatus.innerHTML = "";
  }
  // Handle 'alt' key without 'shift'
  else if (event.altKey && !event.shiftKey) {
    bm.pickedStatus.className = "banned";
    bm.overlay.style.opacity = "0.8";
    bm.metadata.style.opacity = "0.3";
    bm.protect.style.opacity = "0";
    bm.difficulty.style.opacity = "0.3";
    bm.pickedStatus.innerHTML = `Banned`;
  }
  // Handle both 'alt' and 'shift' keys
  else if (event.altKey && event.shiftKey) {
    bm.pickedStatus.className = "pickedStatus";
    bm.protect.style.opacity = "1";
    bm.protect.innerHTML = "Protect";
    bm.protect.style.backgroundColor = "#de3950";
    bm.overlay.style.opacity = "0.5";
    bm.metadata.style.opacity = "1";
    bm.difficulty.style.opacity = "1";
  } 
  // Default action
  else {
    bm.PickedOn("Red");
    if (bm.beatmapID == 1 || bm.beatmapID == 0) {
      pickedWC(bm.beatmapID, bm.pickedStatus.className);
    }
  }
});

// Add a 'contextmenu' event listener
bm.clicker.addEventListener("contextmenu", function (event) {
  // Handle 'shift' key without 'alt'
  if (event.shiftKey && !event.altKey) {
    bm.pickedStatus.className = "bannedBlue";
    bm.overlay.style.opacity = "0.8";
    bm.protect.style.opacity = "0";
    bm.metadata.style.opacity = "0.3";
    bm.difficulty.style.opacity = "0.3";
    bm.pickedStatus.innerHTML = `Banned by ${team2}`;
  }
  // Handle 'ctrl' key
  else if (event.ctrlKey) {
    bm.overlay.style.opacity = "0.5";
    bm.metadata.style.opacity = "1";
    bm.difficulty.style.opacity = "1";
    bm.protect.style.opacity = "0";
    bm.pickedStatus.className = "pickedStatus";
    bm.pickedStatus.innerHTML = "";
  }
  // Handle 'alt' key without 'shift'
  else if (event.altKey && !event.shiftKey) {
    bm.pickedStatus.className = "banned";
    bm.overlay.style.opacity = "0.8";
    bm.protect.style.opacity = "0";
    bm.metadata.style.opacity = "0.3";
    bm.difficulty.style.opacity = "0.3";
    bm.pickedStatus.innerHTML = `Banned`;
  }
  // Handle both 'alt' and 'shift' keys
  else if (event.altKey && event.shiftKey) {
    bm.protect.style.opacity = "1";
    bm.protect.innerHTML = "Protect";
    bm.protect.style.backgroundColor = "#2982e3";
    bm.pickedStatus.className = "pickedStatus";
    bm.overlay.style.opacity = "0.5";
    bm.metadata.style.opacity = "1";
    bm.difficulty.style.opacity = "1";
  } 
  // Default action
  else {
    bm.PickedOn("Blue");
    if (bm.beatmapID == 1 || bm.beatmapID == 0) {
      pickedWC(bm.beatmapID, bm.pickedStatus.className);
    }
  }
});

    const mapData = await getDataSet(beatmap.beatmapId);
    bm.map.style.backgroundImage = `url('${mapData.coverURL}')`;
    bm.metadata.innerHTML = mapData.artist + " - " + mapData.title;
    bm.difficulty.innerHTML =
      `[${mapData.version}]` + "&emsp;&emsp;Mapper: " + mapData.creator;
    beatmaps.add(bm);
  });
}

async function getDataSet(beatmapID) {
  if(beatmapID == 1 || beatmapID == 0){
    return {
        coverURL: './static/placeholder.jpg',
        artist: "?",
        title: "?",
        version: "?",
        creator: "?"
    }
}
  try {
    const data = (await axios.get(`https://gulanovapi.vercel.app/api/b/${beatmapID}`))
      .data;
    const diff = data.beatmaps.filter((diff) => diff.id === beatmapID).shift();

    return {
      coverURL: data.covers["cover@2x"],
      artist: data.artist,
      title: data.title,
      version: diff.version,
      creator: data.creator,
    };
  } catch (error) {
    console.error(error);
  }
}


pickedOnManual = (id) => {
  tempLastPick = tempLastPick === "Red" ? "Blue" : "Red";
  if (document.getElementById(`id-${id}-clicker`)) {
    let pickedStatus = document.getElementById(`id-${id}-status`);
    let overlay = document.getElementById(`id-${id}-overlay`);
    let metadata = document.getElementById(`id-${id}-metadata`);
    let difficulty = document.getElementById(`id-${id}-difficulty`);

    pickedStatus.className = `picked${tempLastPick}`;
    overlay.style.opacity = "0.5";
    metadata.style.opacity = "1";
    difficulty.style.opacity = "1";
    pickedStatus.innerHTML = "Picked";
  }
};

document.querySelector("form").addEventListener("submit", function(event) {
  event.preventDefault(); // Prevents the default form submission
  const selectValue = document.getElementById("WCmapid").value;
  const inputValue = document.getElementById("inputWCmanual").value;
  console.log(`${selectValue} ${inputValue}`);
});

async function pickedWC(id, banned){
  if(banned == "bannedBlue" || banned == "bannedRed" || banned == "banned"){
    return
  }

  const matchID = document.getElementById("matchID"); if (!matchID.value) {matchID.value = "woi"; return;;;;;;;;;;;} //if kosong, GAJADI LOL

  const data = await fetchData(matchID.value)

  if(id == 1){
    generateCard(data)
    console.log(data);
    
    
  }else if(id == 0){
    generateCard(data)
    console.log(data);
  }

  pickerWC.style.visibility = "visible"
}
async function fetchData(matchID) {
  const url = `https://script.google.com/macros/s/AKfycbxyQ67MlGCrIK3AMNDdJ28ZS_vYqvSmR1T6bS-kr4-q06hMhPi2g-ERErw1nrfxCv4-TA/exec?action=getWC&matchID=${matchID}`;

  try {
    const response = await fetch(url);
    const data = await response.json();  // Get JSON data from response
    console.log('Fetched data:', data);  // Log the fetched data
    return data;  // Return the data to the calling function
  } catch (error) {
    console.error('Error fetching data:', error);  // Catch any errors
    return null;  // Return null in case of an error
  }
}


async function generateCard(data){
// Get the container div with id "gacor"
const container = document.getElementById("gacor");
const backgrounds = [];
console.log(data)

// Array of background images
for (let i = 0; i < Object.keys(data).length - 1; i++) {
  const id = Object.keys(data)[i];
  console.log(id)
  try {
    const response = await fetch(`https://gulanovapi.vercel.app/api/b/${id}`);
    const result = await response.json();

    console.log(result); // Log the result from the API
    backgrounds.push(result.covers["card"])
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}
console.log(backgrounds)

// Loop through 1 to 50 to create 50 div elements
for (let i = 1; i <= 50; i++) {
  // Create a new div element
  const itemDiv = document.createElement("div");
  
  // Set the id and class for the div
  itemDiv.id = `item${i}`;
  itemDiv.className = "rollItem";

  // Set the background image to a random choice from the array
  const randomIndex = Math.floor(Math.random() * backgrounds.length);
  itemDiv.style.backgroundImage = `url("${backgrounds[randomIndex]}")`;
  itemDiv.innerHTML = "?"


  // Append the created div to the container
  container.appendChild(itemDiv);
}
}
