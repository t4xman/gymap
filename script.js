

/***** VARIABILI GLOBALI *****/
let currentGym = "GymA";
let machineId = 0;
let currentMachine = null;       // Per schede dinamiche
let currentSelectedMachine = null; // Per macchinari fissi (dettaglio)
let globalCards = JSON.parse(localStorage.getItem("globalCards")) || [];
let globalMachineCards = JSON.parse(localStorage.getItem("globalMachineCards")) || {};
let adminMode = false;
let roomEditMode = false;
let zoomLevel = 1;
/* Forma stanza (clip-path) definita da 5 punti */
let roomCorners = [
  { x: 0,   y: 0 },
  { x: 80,  y: 0 },
  { x: 100, y: 30 },
  { x: 100, y: 100 },
  { x: 0,   y: 100 }
];
let handles = [];
const room = document.getElementById("room");

/***** NAVIGAZIONE (Sidebar) *****/
const pages = ["home", "palestra", "design", "avatar", "schede", "admin"];
function showPage(pageId) {
  pages.forEach(p => {
    document.getElementById(p).classList.add("hidden");
  });
  document.getElementById(pageId).classList.remove("hidden");
  if(pageId === "schede") refreshSchede();
  if(pageId === "admin") { refreshMachineTypeList(); updateMachineTypeSelect(); }
  if(pageId === "palestra") loadMachines();
}
function selectGym(gym) {
  currentGym = gym;
  localStorage.setItem("selectedGym", gym);
  showPage("palestra");
  loadMachines();
}

/***** AVATAR *****/
function saveAvatar() {
  const hair = document.getElementById("hair-color").value;
  const face = document.getElementById("face-color").value;
  const body = document.getElementById("body-color").value;
  const muscle = document.getElementById("muscle-level").value;
  const avatar = { hair, face, body, muscle };
  localStorage.setItem("avatar", JSON.stringify(avatar));
  loadAvatar();
}
function loadAvatar() {
  const avatar = JSON.parse(localStorage.getItem("avatar"));
  if (avatar) {
    const svg = document.getElementById("avatar-svg");
    svg.innerHTML = `
      <circle cx="100" cy="50" r="50" fill="#ffcc99" />
      <rect x="60" y="100" width="${80 + (avatar.muscle - 50)}" height="200" fill="#ffcc99" />
    `;
    document.getElementById("hair-color").value = avatar.hair;
    document.getElementById("face-color").value = avatar.face;
    document.getElementById("body-color").value = avatar.body;
    document.getElementById("muscle-level").value = avatar.muscle;
  }
}

/***** MACCHINARI *****/
function addMachineAtRandom() {
  const x = Math.random() * (room.clientWidth / zoomLevel);
  const y = Math.random() * (room.clientHeight / zoomLevel);
  addMachine(x, y, false, "Macchina");
}
function addMachine(x, y, fixed, type) {
  const machine = document.createElement("div");
  machine.classList.add("machine");
  machine.id = `machine-${machineId++}`;
  if (fixed) {
    machine.setAttribute("data-fixed", "true");
    machine.dataset.type = type;
    if (!machine.dataset.cards) {
      machine.dataset.cards = JSON.stringify([]);
    }
    machine.innerHTML = `
      <div class="machine-title" onclick="toggleMachineContent(this.parentElement)">${type}</div>
      <div class="machine-content">
        <button class="detail-button" onclick="openMachineDetailModal(this.closest('.machine'))">Dettagli</button>
        <button class="add-card-button" onclick="showAddCardModal(this.closest('.machine'))">Aggiungi Scheda</button>
      </div>
    `;
    interact(machine).draggable(adminMode);
  } else {
    machine.innerHTML = `
      <div class="machine-title" onclick="toggleMachineContent(this.parentElement)">Macchina ${machineId}</div>
      <div class="machine-content">
        <button class="add-card-button" onclick="showAddCardModal(this.closest('.machine'))">Aggiungi Scheda</button>
      </div>
    `;
    interact(machine).draggable({
      onmove: dragMoveListener,
      modifiers: [ interact.modifiers.restrictRect({ restriction: "parent", endOnly: true }) ],
      inertia: true,
    });
  }
  let content = machine.querySelector(".machine-content");
  if (content) { content.style.display = "none"; }
  machine.style.left = x + "px";
  machine.style.top = y + "px";
  room.appendChild(machine);
  saveMachines();
}
function toggleMachineContent(machine) {
  const content = machine.querySelector(".machine-content");
  content.style.display = (content.style.display === "" || content.style.display === "none") ? "block" : "none";
}

/***** AGGIUNTA SCHEDE *****/
function showAddCardModal(machine) {
  currentMachine = machine;
  openModal("addCardModal");
}
function addCardToMachine() {
  const name = document.getElementById("card-name").value.trim();
  const repetitions = document.getElementById("repetitions").value;
  const weight = document.getElementById("weight").value;
  if (!name) { alert("Inserisci il nome dell'esercizio"); return; }
  const card = { name, repetitions, weight };
  if (currentMachine.getAttribute("data-fixed") === "true") {
    let cards = [];
    if (currentMachine.dataset.cards) {
      cards = JSON.parse(currentMachine.dataset.cards);
    }
    cards.push(card);
    currentMachine.dataset.cards = JSON.stringify(cards);
    updateMachineDetailModal(currentMachine);
    let type = currentMachine.dataset.type;
    if (!globalMachineCards[type]) globalMachineCards[type] = [];
    globalMachineCards[type].push(card);
    localStorage.setItem("globalMachineCards", JSON.stringify(globalMachineCards));
  } else {
    const cardDiv = document.createElement("div");
    cardDiv.classList.add("card");
    cardDiv.innerHTML = `
      <table>
        <tr>
          <th>Nome</th>
          <th>Ripetizioni</th>
          <th>Peso</th>
        </tr>
        <tr>
          <td>${name}</td>
          <td>${repetitions}</td>
          <td>${weight}</td>
        </tr>
      </table>
      <button class="delete-button" onclick="deleteCard(this)">X</button>
    `;
    currentMachine.querySelector(".machine-content").appendChild(cardDiv);
  }
  if (!globalCards.find(c => c.name === name)) {
    globalCards.push(card);
    localStorage.setItem("globalCards", JSON.stringify(globalCards));
  }
  saveMachines();
  closeModal("addCardModal");
}

/***** DRAG & DROP *****/
function dragMoveListener(event) {
  const target = event.target;
  const x = (parseFloat(target.getAttribute("data-x")) || 0) + event.dx / zoomLevel;
  const y = (parseFloat(target.getAttribute("data-y")) || 0) + event.dy / zoomLevel;
  target.style.transform = `translate(${x}px, ${y}px)`;
  target.setAttribute("data-x", x);
  target.setAttribute("data-y", y);
}

/***** SALVATAGGIO E CARICAMENTO MACCHINARI *****/
function saveMachines() {
  const machines = document.querySelectorAll(".machine");
  const machineData = [];
  machines.forEach(machine => {
    const rect = machine.getBoundingClientRect();
    const parentRect = room.getBoundingClientRect();
    const x = (rect.left - parentRect.left) / zoomLevel;
    const y = (rect.top - parentRect.top) / zoomLevel;
    let cards = [];
    if (machine.getAttribute("data-fixed") === "true") {
      if (machine.dataset.cards) { cards = JSON.parse(machine.dataset.cards); }
    } else {
      machine.querySelectorAll(".card").forEach(cardDiv => {
        const tds = cardDiv.querySelectorAll("td");
        cards.push({
          name: tds[0].innerText,
          repetitions: tds[1].innerText,
          weight: tds[2].innerText
        });
      });
    }
    machineData.push({
      id: machine.id,
      x, y,
      fixed: machine.getAttribute("data-fixed") === "true",
      type: (machine.getAttribute("data-fixed") === "true") ? machine.dataset.type : machine.querySelector(".machine-title").innerText,
      cards: cards
    });
  });
  localStorage.setItem("machines_" + currentGym, JSON.stringify(machineData));
}
function loadMachines() {
  room.innerHTML = `<div class="door ingresso">Ingresso</div><div class="door uscita">Uscita</div>`;
  const machineData = JSON.parse(localStorage.getItem("machines_" + currentGym)) || [];
  machineId = 0;
  machineData.forEach(data => {
    const machine = document.createElement("div");
    machine.classList.add("machine");
    machine.id = data.id;
    let parts = data.id.split("-");
    let num = parseInt(parts[1]);
    if (num >= machineId) machineId = num + 1;
    if (data.fixed) {
      machine.setAttribute("data-fixed", "true");
      machine.dataset.type = data.type;
      machine.innerHTML = `
        <div class="machine-title" onclick="toggleMachineContent(this.parentElement)">${data.type}</div>
        <div class="machine-content">
          <button class="detail-button" onclick="openMachineDetailModal(this.closest('.machine'))">Dettagli</button>
          <button class="add-card-button" onclick="showAddCardModal(this.closest('.machine'))">Aggiungi Scheda</button>
        </div>
      `;
      interact(machine).draggable(adminMode);
      if(data.cards) { machine.dataset.cards = JSON.stringify(data.cards); }
    } else {
      machine.innerHTML = `
        <div class="machine-title" onclick="toggleMachineContent(this.parentElement)">Macchina ${data.id.split("-")[1]}</div>
        <div class="machine-content">
          <button class="add-card-button" onclick="showAddCardModal(this.closest('.machine'))">Aggiungi Scheda</button>
        </div>
      `;
      interact(machine).draggable({
        onmove: dragMoveListener,
        modifiers: [ interact.modifiers.restrictRect({ restriction: "parent", endOnly: true }) ],
        inertia: true,
      });
      data.cards.forEach(cardData => {
        const cardDiv = document.createElement("div");
        cardDiv.classList.add("card");
        cardDiv.innerHTML = `
          <table>
            <tr>
              <th>Nome</th>
              <th>Ripetizioni</th>
              <th>Peso</th>
            </tr>
            <tr>
              <td>${cardData.name}</td>
              <td>${cardData.repetitions}</td>
              <td>${cardData.weight}</td>
            </tr>
          </table>
          <button class="delete-button" onclick="deleteCard(this)">X</button>
        `;
        machine.querySelector(".machine-content").appendChild(cardDiv);
      });
    }
    machine.style.left = data.x + "px";
    machine.style.top = data.y + "px";
    let content = machine.querySelector(".machine-content");
    if (content) { content.style.display = "none"; }
    room.appendChild(machine);
  });
}

/***** ELIMINAZIONE MACCHINARI *****/
function deleteAllMachines() {
  document.querySelectorAll(".machine").forEach(m => m.remove());
  localStorage.removeItem("machines_" + currentGym);
  machineId = 0;
}

/***** ADMIN MODE *****/
function toggleAdminMode() {
  const checkbox = document.getElementById("adminModeSwitch");
  adminMode = checkbox.checked;
  const fixedMachines = document.querySelectorAll('.machine[data-fixed="true"]');
  fixedMachines.forEach(m => {
    interact(m).draggable(adminMode);
  });
  saveMachines();
}

/***** ADMIN: GESTIONE MACCHINARI FISSI *****/
const machineTypes = [
  "Chest Press", "Leg Press", "Treadmill", "Rowing Machine", "Elliptical",
  "Shoulder Press", "Bicep Curl", "Tricep Extension", "Lat Pulldown", "Ab Crunch"
];
function refreshMachineTypeList() {
  const container = document.getElementById("machine-type-list");
  container.innerHTML = "";
  machineTypes.forEach(type => {
    const btn = document.createElement("button");
    btn.innerText = type;
    btn.onclick = () => { addFixedMachine(type); };
    container.appendChild(btn);
  });
}
function addFixedMachine(type) {
  const x = 50, y = 50;
  addMachine(x, y, true, type);
}

/***** ADMIN: DETTAGLI MACCHINARIO FISSO *****/
function openMachineDetailModal(machine) {
  currentSelectedMachine = machine;
  document.getElementById("machineDetailName").innerText = machine.querySelector(".machine-title").innerText;
  updateMachineDetailModal(machine);
  openModal("machineDetailModal");
}
function updateMachineDetailModal(machine) {
  let html = "";
  if(machine.dataset.cards) {
    const cards = JSON.parse(machine.dataset.cards);
    cards.forEach(card => {
      html += `<strong>${card.name}</strong><br>
               Ripetizioni: ${card.repetitions}<br>
               Peso: ${card.weight}<br><hr>`;
    });
  }
  if(html === "") html = "Nessuna scheda allegata";
  document.getElementById("attachedCardDetails").innerHTML = html;
}
function openCardSelectionModal() {
  const container = document.getElementById("globalCardList");
  container.innerHTML = "";
  globalCards.forEach(card => {
    const btn = document.createElement("button");
    btn.innerText = card.name;
    btn.onclick = () => {
      attachCardToCurrentMachine(card);
      closeModal("cardSelectionModal");
      closeModal("machineDetailModal");
    };
    container.appendChild(btn);
  });
  openModal("cardSelectionModal");
}
function attachCardToCurrentMachine(card) {
  if(currentSelectedMachine) {
    let cards = [];
    if(currentSelectedMachine.dataset.cards) {
      cards = JSON.parse(currentSelectedMachine.dataset.cards);
    }
    cards.push(card);
    currentSelectedMachine.dataset.cards = JSON.stringify(cards);
    let type = currentSelectedMachine.dataset.type;
    if(!globalMachineCards[type]) globalMachineCards[type] = [];
    globalMachineCards[type].push(card);
    localStorage.setItem("globalMachineCards", JSON.stringify(globalMachineCards));
    updateMachineDetailModal(currentSelectedMachine);
    saveMachines();
  }
}
function openAddCardModalForFixed() {
  currentMachine = currentSelectedMachine;
  openModal("addCardModal");
}

/***** ADMIN: ESERCIZI GLOBALI PER TIPO DI MACCHINA *****/
function updateMachineTypeSelect() {
  const select = document.getElementById("machineTypeSelect");
  if(select) {
    select.innerHTML = "";
    machineTypes.forEach(type => {
      const opt = document.createElement("option");
      opt.value = type;
      opt.innerText = type;
      select.appendChild(opt);
    });
  }
}
function addGlobalExercise() {
  const type = document.getElementById("machineTypeSelect").value;
  const name = document.getElementById("globalExerciseName").value.trim();
  const reps = document.getElementById("globalExerciseReps").value;
  const weight = document.getElementById("globalExerciseWeight").value;
  if(!name) { alert("Inserisci un nome esercizio!"); return; }
  const exercise = { name, repetitions: reps, weight };
  if(!globalMachineCards[type]) globalMachineCards[type] = [];
  globalMachineCards[type].push(exercise);
  localStorage.setItem("globalMachineCards", JSON.stringify(globalMachineCards));
  const fixedMachines = document.querySelectorAll(`.machine[data-fixed="true"][data-type="${type}"]`);
  fixedMachines.forEach(m => {
    let cards = [];
    if(m.dataset.cards) cards = JSON.parse(m.dataset.cards);
    cards.push(exercise);
    m.dataset.cards = JSON.stringify(cards);
  });
  document.getElementById("globalExerciseName").value = "";
  document.getElementById("globalExerciseReps").value = "";
  document.getElementById("globalExerciseWeight").value = "";
  closeModal("addGlobalExerciseModal");
  saveMachines();
}

/***** MODALI *****/
function openModal(modalId) {
  document.getElementById(modalId).style.display = "block";
}
function closeModal(modalId) {
  document.getElementById(modalId).style.display = "none";
  if(modalId === "addCardModal") {
    document.getElementById("card-name").value = "";
    document.getElementById("repetitions").value = "";
    document.getElementById("weight").value = "";
  } else if(modalId === "mapModal") {
    document.getElementById("mapUrl").value = "";
  }
}

/***** DESIGN PALESTRA *****/
function saveRoomDesign() {
  localStorage.setItem("roomDesign", JSON.stringify(roomCorners));
  alert("Design della palestra salvato!");
}
function loadRoomDesign() {
  const design = JSON.parse(localStorage.getItem("roomDesign"));
  if(design) {
    roomCorners = design;
    updateClipPath();
  }
}

/***** SFONDO PLANIMETRIA *****/
function setMapBackground() {
  const url = document.getElementById("mapUrl").value.trim();
  if(url) { room.style.backgroundImage = `url("${url}")`; }
  else { room.style.backgroundImage = ""; }
  closeModal("mapModal");
}

/***** CLIP-PATH & HANDLE PER MODIFICA FORMA STANZA *****/
function createHandles() {
  removeHandles();
  roomCorners.forEach((corner, index) => {
    const handle = document.createElement("div");
    handle.classList.add("room-handle");
    handle.dataset.index = index;
    room.appendChild(handle);
    handles.push(handle);
    setHandlePosition(handle, corner);
    handle.style.display = "block";
    interact(handle).draggable({
      onmove: (event) => {
        const i = parseInt(event.target.dataset.index);
        const rect = room.getBoundingClientRect();
        const currentX = (roomCorners[i].x / 100) * rect.width;
        const currentY = (roomCorners[i].y / 100) * rect.height;
        const newX = currentX + event.dx;
        const newY = currentY + event.dy;
        roomCorners[i].x = (newX / rect.width) * 100;
        roomCorners[i].y = (newY / rect.height) * 100;
        setHandlePosition(event.target, roomCorners[i]);
        updateClipPath();
      }
    });
  });
}
function removeHandles() {
  handles.forEach(h => h.remove());
  handles = [];
}
function setHandlePosition(handle, corner) {
  const rect = room.getBoundingClientRect();
  const pxX = (corner.x / 100) * rect.width;
  const pxY = (corner.y / 100) * rect.height;
  handle.style.left = pxX + "px";
  handle.style.top = pxY + "px";
}
function updateClipPath() {
  const points = roomCorners.map(c => `${c.x}% ${c.y}%`).join(", ");
  room.style.clipPath = `polygon(${points})`;
}
window.addEventListener("resize", () => {
  if(roomEditMode) {
    handles.forEach((handle, i) => setHandlePosition(handle, roomCorners[i]));
  }
});

/***** AGGREGAZIONE SCHEDE GLOBALI *****/
function refreshSchede() {
  const machineData = JSON.parse(localStorage.getItem("machines_" + currentGym)) || [];
  let aggregated = [];
  machineData.forEach(m => {
    if(m.cards && m.cards.length > 0) {
      aggregated = aggregated.concat(m.cards);
    }
  });
  const list = document.getElementById("schede-list");
  list.innerHTML = "";
  aggregated.forEach(card => {
    const div = document.createElement("div");
    div.classList.add("card");
    div.innerHTML = `
      <table>
        <tr>
          <th>Nome</th>
          <th>Ripetizioni</th>
          <th>Peso</th>
        </tr>
        <tr>
          <td>${card.name}</td>
          <td>${card.repetitions}</td>
          <td>${card.weight}</td>
        </tr>
      </table>
      <button onclick="deleteGlobalCard('${card.name}')">Elimina</button>
    `;
    list.appendChild(div);
  });
}
function deleteGlobalCard(cardName) {
  globalCards = globalCards.filter(c => c.name !== cardName);
  localStorage.setItem("globalCards", JSON.stringify(globalCards));
  const machineData = JSON.parse(localStorage.getItem("machines_" + currentGym)) || [];
  machineData.forEach(m => {
    if(m.cards) {
      m.cards = m.cards.filter(card => card.name !== cardName);
    }
  });
  localStorage.setItem("machines_" + currentGym, JSON.stringify(machineData));
  loadMachines();
  refreshSchede();
}
