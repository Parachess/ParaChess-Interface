/**
 * This file contains the Game class.
 * A Game object has a name, a list of teams and of players, an initial side,
 * a variable that allows to check if the game is over, the reason for which a game
 * is over and a list of winning sides. A Game objects must also provide
 * a list of positions (or situations) that occurred during the game and a history of actions.
 * It has various methods to deal with users and teams. Also it provides a method to check whether
 * it is possible to undo an action. Finally the game contains the last time it was played.
 * 
 * @author ParaGames
 */
export default class Game {

    /**
     * Constructor
     * 
     * @param {string} name the name of the game
     * @param {Array[string]} teams the list of supported teams for the game
     * @param {string} side the first player
     * @param {Object} players a dictionary of players
     */
    constructor(name, teams, side, players = {}) {
        this.name = name;
        this.teams = teams;
        this.side = teams.includes(side) ? side : teams[0] ?? null;
        this.players = players;
        this.gameOver = false;
        this.reasonOfGameOver = null;
        this.winningSides = [];
        this.positions = [];
        this.history = [];
        this.losingTeams = [];
        this.lastActionTime = Date.now();
    }

    /**
     * Undoes the last played move. The code is different for every games
     * 
     * @param {string} user the user trying to undo a move
     * @param {object} _object data required to undo a move
     * @returns {boolean} 'true' if the move is undone
     */
    undo(user, _object) {
        return this.isPlayer(user) && this.getTeamsOfPlayer(user).length >= this.teams.length && this.history.length > 0 && !this.gameOver;
    }

    /**
     * Gives the next team from one side 
     * 
     * @param {string} initialSide the initial team (by default it's the 'side' property) 
     * @param {boolean} skipLosingTeams skip the teams that don't play anymore
     * @returns {string} the next team
     */
    getNextTeam(side=this.side, skipLosingTeams=true) {
        let i = -1;
        for (let j = 0; j < this.teams.length - 1; j++) {
            if (this.teams[j] === side && (!skipLosingTeams || !this.losingTeams.includes(this.teams[j]))) {
                i = j;
                break;
            }
        }
        return i === -1 ? this.teams[0] : this.teams[i + 1];
    }

    /**
     * Gives the previous team from one side 
     * 
     * @param {string} initialSide the initial team (by default it's the 'side' property) 
     * @param {boolean} skipLosingTeams skip the teams that don't play anymore
     * @returns {string} the previous team
     */
    getPreviousTeam(side = this.side, skipLosingTeams=true) {
        let i = -1;
        for (let j = 1; j < this.teams.length; j++) {
            if (this.teams[j] === side, (!skipLosingTeams || !this.losingTeams.includes(this.teams[j]))) {
                i = j;
                break;
            }
        }
        return i === -1 ? this.teams[this.teams.length - 1] : this.teams[i - 1];
    }

    /**
     * Returns the teams that have players
     * 
     * @returns {Array[string]} the teams that have players
     */
    getAssignedTeams() {
        const assigned = [];
        Object.keys(this.players).forEach(player => {
            this.getTeamsOfPlayer(player).forEach(team => {
                if (!assigned.includes(team))
                    assigned.push(team);
            })
        });
        return assigned;
    }

    /**
     * Returns the teams that doesn't have any player
     * 
     * @returns {Array[string]} the list of unassigned teams
     */
    getUnassignedTeams() {
        const assigned = this.getAssignedTeams();
        const unassigned = [];
        this.teams.forEach(team => {
            if (!assigned.includes(team))
                unassigned.push(team);
        });
        return unassigned;
    }

    /**
     * Checks if an id is registered as a player
     * 
     * @param {string} id the supposed player
     * @returns {boolean} 'true' if the id corresponds to a player
     */
    isPlayer(id) {
        return this.players[id] !== undefined && this.players[id] !== null && this.players[id].length > 0;
    }

    /**
     * Attempts to add a player. If the player is already in the game but asks for
     * more teams, he will be given in total the number of teams he asks for
     * (or the maximum of teams).
     * 
     * @param {string} id the id of the player
     * @param {int} teams the number of teams the player wants to play for
     * @returns {int} the number of roles the player may have
     */
    addPlayer(id, teams) {
        const numberOfSidesOccupied = this.getTeamsOfPlayer(id).length;
        if (numberOfSidesOccupied >= teams)
            return numberOfSidesOccupied;
        const unassigned = this.getUnassignedTeams();
        const rolesToBeAdded = teams - numberOfSidesOccupied;
        const maximumRolesToGive = rolesToBeAdded > unassigned.length ? unassigned.length : rolesToBeAdded;
        let given = 0;
        if (!this.isPlayer(id))
            this.players[id] = [];
        for (let i = 0; i < maximumRolesToGive; i++) {
            this.players[id].push(unassigned[i]);
            given++;
        }
        return given;
    }

    /**
     * Checks whether a game is playable (if unassigned teams exists)
     * 
     * @return {boolean} 'true' if players can still join the game
     */
    isPlayable() {
        return this.getUnassignedTeams().length > 0;
    }

    /**
     * get a list of players and their roles :
     * [ {player : str, teams : array[str]}]
     * 
     * @return {Array[Object]} the list of players
     */
    getPlayers() {
        const players = [];
        Object.keys(this.players).forEach(player =>{
            players.push({'player' : player, 'teams' : this.getTeamsOfPlayer(player)});
        });
        return players;
    }

    /**
     * Returns the list of the teams assigned to a player
     * 
     * @param {string} id the id of a player
     * @return {Array[string]} the list of teams owned by player
     */
    getTeamsOfPlayer(id) {
        return Object.keys(this.players).includes(id) ? this.players[id] : [];
    }

    /**
     * Returns a 'players' object with every role changed
     * 
     * @returns {Object} a dictionary
     */
    getSwappedTeams() {
        let swappedTeams = {};
        Object.keys(this.players).forEach(id => {
            const teams = this.getTeamsOfPlayer(id);
            const newTeams = [];
            teams.forEach(team => {
                newTeams.push(this.getNextTeam(team, false));
            });
            swappedTeams[id] = newTeams;
        });
        return swappedTeams;
    }

    /** 
     * Checks if a player owns all the teams
     * 
     * @param {string} id the id of a player
     * @return {boolean} 'true' if the player own all the teams, 'false' otherwise
     */
    isAdmin(id) {
        return this.getTeamsOfPlayer(id).length >= this.teams.length;
    }

    /**
     * returns the complete list of past and current positions
     * 
     * @return {Array[Object]} the list of positions
     */
    getPositions() {
        return this.positions;
    }

    /**
     * update the last action time of the game
     */
    update() {
        this.lastActionTime = Date.now();
    }

    /**
     * resign a game
     * 
     * @param {string} user the id of the user
     * @param {string} side the side
     * @returns {boolean} 'true' if the resignation succeeded
     */
    resign(user, side) {
        if (!this.getTeamsOfPlayer(user).includes(side))
            return false;
        if (!this.losingTeams.includes(side) && this.teams.includes(side)) {
            this.losingTeams.push(side);
            if (this.side === side) this.side = this.getNextTeam(); 
            if (this.losingTeams.length === this.teams.length - 1) {
                this.gameOver = true;
                this.reason = "abandon";
                this.winningSides = this.teams.filter(side => !this.losingTeams.contains(side));
            }
            return true;
        }
        
    }

    /**
     * build an object to determine whether a player is able to play or not
     * 
     * @param {string} user the id of the player
     * @returns {object} return {status: string, sides: Array[string], isAdmin: boolean, reason: string}
     */
    buildAccessObject(user) {
        const object = {
            status: "REFUSED",
            sides: [],
            isAdmin: false,
            reason: "La partie est déjà remplie !"
        }
        if (this.isPlayer(user)) {
            const teams = this.getTeamsOfPlayer(user);
            object.status = "ALLOWED";
            object.sides = teams;
            object.isAdmin = this.teams.length === teams.length;
            object.reason = "Il y a suffisamment de place pour vous !";
        }
        return object;
    }
}