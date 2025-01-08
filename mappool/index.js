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

    bm.clicker.addEventListener("mousedown", function (event) {
      // Ignore the mousedown event if the button is not the left mouse button
      if (event.button !== 0) {
        return; // Only proceed for left-click (button 0)
      }
    
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
    
    bm.clicker.addEventListener("contextmenu", function (event) {
      // Prevent default right-click context menu
      event.preventDefault();
    
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

    document.getElementById("id-1-difficulty").innerHTML = ""
    document.getElementById("id-1-metadata").innerHTML = ""
    document.getElementById("id-0-metadata").innerHTML = ""
    document.getElementById("id-0-difficulty").innerHTML = ""
    document.getElementById("id-0-modicon").style.visibility = "hidden";
    document.getElementById("id-1-modicon").style.visibility = "hidden";
  });
}

async function getDataSet(beatmapID) {
  if(beatmapID == 1 || beatmapID == 0){
    return {
        coverURL: '../static/placeholder.png',
        artist: "",
        title: "",
        version: "",
        creator: ""
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

document.querySelector("form").addEventListener("submit", async function(event) {
  event.preventDefault(); // Prevents the default form submission
  const selectValue = document.getElementById("WCmapid").value;
  const inputValue = document.getElementById("inputWCmanual").value;

  if(!inputValue){
    inputValue = "input invalid"
    return;
  }

  if(selectValue == 1){
    const parentElement = document.getElementById('WC');
    pickedOnManual(1)
    // Get all child elements inside the parent that have an id starting with "id-1"
    const elements = parentElement.querySelectorAll('[id^="id-1"]');
    wc1 = document.getElementById("id-1-status");

    wc1.className = "pickedRed";
    wc1.innerHTML = "Picked"
    // Loop through each element and update its id
    elements.forEach(element => {
        const newId = element.id.replace("id-1", "id-active");
        element.id = newId;
    });
    
    
    
  }else if(selectValue == 0){
    const parentElement = document.getElementById('WC');
    pickedOnManual(0)
    wc0 = document.getElementById("id-0-status");

    wc0.className = "pickedBlue";
    wc0.innerHTML = "Picked"
    // Get all child elements inside the parent that have an id starting with "id-1"
    const elements = parentElement.querySelectorAll('[id^="id-0"]');

    // Loop through each element and update its id
    elements.forEach(element => {
        const newId = element.id.replace("id-0", "id-active");
        element.id = newId;
    });
  }

  winnermanual = await getDataSet(Number(inputValue));
  console.log(winnermanual)

  bg = document.getElementById("id-active-BG");
  metadata = document.getElementById("id-active-metadata");
  difficulty = document.getElementById("id-active-difficulty");
  logo = document.getElementById("id-active-modicon");

  logo.style.visibility = "visible";
            
  bg.style.backgroundImage = `url('${winnermanual.coverURL}')`;
  metadata.innerHTML = winnermanual.artist + " - " + winnermanual.title;
  difficulty.innerHTML =
  `[${winnermanual.version}]` + "&emsp;&emsp;Mapper: " + winnermanual.creator;

  
  if(!document.getElementById('id-complete-clicker')){
  const parentElement = document.getElementById('WC');
  const elements = parentElement.querySelectorAll('[id^="id-active"]');
  elements.forEach(element => {
      const newId = element.id.replace("id-active", "id-complete");
      element.id = newId;
  });

  
  resetEventListeners(document.getElementById("id-complete-clicker"))
  }else{
      const parentElement = document.getElementById('WC');
      const elements = parentElement.querySelectorAll('[id^="id-active"]');
      elements.forEach(element => {
          const newId = element.id.replace("id-active", "id-complete2");
          element.id = newId;
      });

      resetEventListeners(document.getElementById("id-complete2-clicker"))
  }

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
    const parentElement = document.getElementById('WC');

    // Get all child elements inside the parent that have an id starting with "id-1"
    const elements = parentElement.querySelectorAll('[id^="id-1"]');

    // Loop through each element and update its id
    elements.forEach(element => {
        const newId = element.id.replace("id-1", "id-active");
        element.id = newId;
    });
    
    
  }else if(id == 0){
    generateCard(data)
    console.log(data);
    const parentElement = document.getElementById('WC');

    // Get all child elements inside the parent that have an id starting with "id-1"
    const elements = parentElement.querySelectorAll('[id^="id-0"]');

    // Loop through each element and update its id
    elements.forEach(element => {
        const newId = element.id.replace("id-0", "id-active");
        element.id = newId;
    });
  }
  const mappoolcontainertriggerwc = document.getElementById("mappoolContainer");
  pickerWC.style.visibility = "visible"
  mappoolcontainertriggerwc.style.opacity = "20%"
}
async function fetchData(matchID) {
  const url = `https://script.google.com/macros/s/AKfycbxyQ67MlGCrIK3AMNDdJ28ZS_vYqvSmR1T6bS-kr4-q06hMhPi2g-ERErw1nrfxCv4-TA/exec?action=getWC&matchID=${matchID}`;

  try {
    const response = await fetch(url);
    const data = await response.json();  // Log the fetched data
    return data;  // Return the data to the calling function
  } catch (error) {
    console.error('Error fetching data:', error);  // Catch any errors
    return null;  // Return null in case of an error
  }
}


async function generateCard(data) {
  const container = document.getElementById("gacor");
  let backgrounds = [];
  const localCache = JSON.parse(localStorage.getItem("backgroundCache")) || { hash: null, backgrounds: {}, fetchedIDs: [] };

  // Generate a hash of the current IDs from data
  const currentIDs = Object.keys(data).slice(0, -1); // Exclude the last key
  const currentHash = generateHash(currentIDs.join(",")); // Create a hash of the concatenated IDs

  if (localCache.hash === currentHash) {
    console.log("Cache is valid. Using cached backgrounds.");
    backgrounds = Object.values(localCache.backgrounds);
  } else {
    console.log("Cache is outdated. Updating cache.");
    const updatedBackgrounds = { ...localCache.backgrounds }; // Clone current backgrounds
    const fetchedIDs = new Set(localCache.fetchedIDs); // Convert fetched IDs to a set

    // Remove IDs that no longer exist in the current list
    for (const id of fetchedIDs) {
      if (!currentIDs.includes(id)) {
        delete updatedBackgrounds[id];
        fetchedIDs.delete(id);
      }
    }

    // Fetch missing IDs
    for (const id of currentIDs) {
      if (!fetchedIDs.has(id)) {
        try {
          const response = await fetch(`https://gulanovapi.vercel.app/api/b/${id}`);
          const result = await response.json();
          console.log(`Fetched background for ID ${id}:`, result.covers["card"]);
          updatedBackgrounds[id] = result.covers["card"];
          fetchedIDs.add(id);
        } catch (error) {
          console.error(`Error fetching background for ID ${id}:`, error);
        }
      }
    }

    // Update the cache with new data
    localStorage.setItem(
      "backgroundCache",
      JSON.stringify({ hash: currentHash, backgrounds: updatedBackgrounds, fetchedIDs: Array.from(fetchedIDs) })
    );

    backgrounds = Object.values(updatedBackgrounds);
  }

 

  // Clear the container and populate it with new elements
  container.innerHTML = ""; // Clear any existing content in the container
  for (let i = 1; i <= 50; i++) {
    const itemDiv = document.createElement("div");
    itemDiv.id = `item${i}`;
    itemDiv.className = "rollItem";
    const randomIndex = Math.floor(Math.random() * backgrounds.length);
    itemDiv.style.backgroundImage = `url("${backgrounds[randomIndex]}")`;
    itemDiv.innerHTML = "?";
    
    container.appendChild(itemDiv);
  }

  const backgroundDongo = localCache.backgrounds;
  console.log("data original", data)
  winnerdiv = document.getElementById("item45");
  console.log(Number(data.picked[0]))
  winnerdiv.style.backgroundImage = `url(${backgroundDongo[data.picked[0]]})`
  
  
  WCsubmitter.innerHTML = "Submitted by " + data.picked[1];
  pickedid = data.picked[0]
  
  
}


function generateHash(data) {
  // Simple hash generation function for strings
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return hash;
}
