// source pour règles : https://www.hellointerview.com/learn/low-level-design/problem-breakdowns/connect-four

const dictCouleurs = {'red' : 'rouge', 'blue' : 'bleu'};
const dictCouleursEmojis = {'red' : '🔴', 'blue' : '🔵'};


function creationGrilleBoutons(){
    /*
    Fonction créant la grille de boutons pour choisir la colonne où déposer son jeton
    */
    const tab = document.createElement('table');
    const divButtons = document.getElementById("div-button"); 
    tab.id = "grille-boutons";
    divButtons.appendChild(tab);
    const tbody = document.createElement('tbody');
    tab.appendChild(tbody);
    const tr = document.createElement('tr');
    tbody.appendChild(tr);
    for (let i = 1; i < 8; i++){
        const td = document.createElement('td');
        td.id = "case_" + i
        const btn = document.createElement('button');
        btn.innerText = String(i);
        btn.id = "btn_" + i; 
        td.appendChild(btn);
        tr.appendChild(td);
    }
}

function creationGrilleJeu(){
    /*
    Fonction créant la grille de jeu
    */
    const tab = document.createElement('table');
    const divTab = document.getElementById("div-tab"); 
    tab.id = "grille";
    divTab.appendChild(tab);
    const tbody = document.createElement('tbody');
    tab.appendChild(tbody);
    for (let i = 1; i < 7; i++){
        const tr = document.createElement('tr');
        tr.id = "ligne_" + i;
        tbody.appendChild(tr);
        for (let j = 1; j < 8; j++){
            let td = document.createElement('td');
            td.id = 'ligne_' + i + '_col_' + j;
            tr.appendChild(td);
        }
    }
}

function getNumeroLigne(partieEnCours, colonneChoisie){
    /*
    Fonction permettant de savoir quelle est la première case de libre en fonction d'une colonne donné
    */
    let colonne = colonneChoisie - 1;
    for (let i = 5; i >= 0; i--){
        if (partieEnCours[i][colonne] === null){
            let ligneGrille = i + 1;
            return ligneGrille
        }
    }
    return -1
}

function getBaliseCaseLibre(colonneChoisie, ligneChoisie){
    const baliseCaseChoisie = document.getElementById('ligne_' + ligneChoisie + '_col_' + colonneChoisie);
    return baliseCaseChoisie
}


function inBounds(r, c) {
    // Vérifie si les coordonnées existent dans ton tableau JS (0 à 5 pour les lignes, 0 à 6 pour les colonnes)
    return r >= 0 && r < 6 && c >= 0 && c < 7;
}

function countInDirection(partieEnCours, row, col, dr, dc, colorSymbol) {
    let count = 0;
    
    // CORRECTION ICI : Sécurisation mathématique totale pour éviter que "0 + 1" devienne "01"
    let r = Number(row) + Number(dr);
    let c = Number(col) + Number(dc);
    
    // Tant qu'on est dans la grille et que la case appartient au même joueur
    while (inBounds(r, c) && partieEnCours[r][c] === colorSymbol) {
        count++;
        r += Number(dr);
        c += Number(dc);
    }
    return count;
}

function checkWin(partieEnCours, row, col, colorSymbol) {
    // Les 4 directions à chercher : [ligne, colonne]
    // [0, 1]  -> Horizontale (droite)
    // [1, 0]  -> Verticale (bas)
    // [1, 1]  -> Diagonale descendante (bas-droite)
    // [-1, 1] -> Diagonale montante (haut-droite)
    const directions = [[0, 1], [1, 0], [1, 1], [-1, 1]];
    
    for (let i = 0; i < directions.length; i++) {
        let dr = directions[i][0];
        let dc = directions[i][1];
        
        let count = 1; // On compte le jeton qui vient d'être posé
        
        // On cherche en avant (ex: vers la droite)
        count += countInDirection(partieEnCours, row, col, dr, dc, colorSymbol);
        // On cherche en arrière (ex: vers la gauche en inversant la direction : -dr, -dc)
        count += countInDirection(partieEnCours, row, col, -dr, -dc, colorSymbol);
        
        // Si on trouve 4 jetons ou plus alignés, c'est gagné !
        if (count >= 4) {
            return true;
        }
    }
    return false;
}

function indiquerCouleurSidePanel(couleur){
    annonceCouleur = document.getElementById("side");
    annonceCouleur.innerText = "Trait au " + dictCouleurs[couleur] + ' ' + dictCouleursEmojis[couleur] + ".";
}


creationGrilleBoutons();
creationGrilleJeu();

// Création du tableau représentant la partie en cours
let partieEnCours = Array(6).fill(null).map(() => Array(7).fill(null)); 
let couleur = 'blue';

const zoneBoutons = document.getElementById('div-button');
zoneBoutons.addEventListener('click', e => {
    let elementClique = e.target;

    if (elementClique.tagName !== 'BUTTON') return;

    let colonneChoisie = parseInt(elementClique.textContent, 10);
    let ligneChoisie = getNumeroLigne(partieEnCours, colonneChoisie);
    if (ligneChoisie !== -1){
        // Place le jeton dans sa case
        const colonneListe = colonneChoisie - 1;
        const ligneListe =  ligneChoisie - 1;
        partieEnCours[ligneListe][colonneListe] = couleur[0]
        const baliseCaseLibre = getBaliseCaseLibre(colonneChoisie, ligneChoisie);
        baliseCaseLibre.style.backgroundColor = couleur;
        
        // AJOUT : Vérification de la victoire (consersation stricte de tes variables)
        if (checkWin(partieEnCours, ligneListe, colonneListe, couleur[0])) {
            setTimeout(() => {
                alert("Le joueur avec la couleur " + couleur + " a gagné ! 🎉");
            }, 50);
            return; // Bloque le changement de couleur car la partie est finie
        }
    }

    if (couleur === 'blue'){
        couleur = 'red';
    }
    else{
        couleur = 'blue';
    }
    indiquerCouleurSidePanel(couleur);
    // console.log(partieEnCours);
});

/* ----------- Déplacement entre les boutons au clavier---- */

window.addEventListener('keydown',e =>{
    if (["ArrowLeft", "ArrowRight"].includes(e.key)){
        e.preventDefault();
        e.stopPropagation();
        const actuelBoutonFocus = document.activeElement;
        if (e.key === "ArrowLeft"){
            const nouveauBoutonFocus = document.getElementById("btn_"+(parseInt(actuelBoutonFocus.innerText) - 1));
            if (nouveauBoutonFocus) nouveauBoutonFocus.focus();
        }
        else if (e.key === "ArrowRight"){
            const nouveauBoutonFocus = document.getElementById("btn_"+(parseInt(actuelBoutonFocus.innerText) + 1));
            if (nouveauBoutonFocus) nouveauBoutonFocus.focus();
        }
    }
})

/* ----------- Fonctions OnClick() ------ */

function resign() {
    document.getElementById("confirmation-popup").classList.add("visible");
    setTimeout(() => document.querySelector('#confirmation-popup .popup-option').focus(), 100);
}

// Fonction à compléter
function validateResign(validation=false) {
    document.getElementById("confirmation-popup").classList.remove("visible");
    if (validation) socket?.emit("resign");
}

function undo(){
    
}