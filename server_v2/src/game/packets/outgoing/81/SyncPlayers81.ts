import BitWriter from "../../../../utils/write-data/BitWriter";
import Player from "src/game/entities/game/Player";
import RSString from "../../../../utils/RSString";
import Masks from "./Masks";
import MovementHandler from "../../../../handlers/MovementHandler";
import PlayerHandler from "../../../../handlers/PlayerHandler";
// TESTING UTIL INSPECTION
// We have circular references when stringifying a socket, we don't actually care about the socket. We care about the player
// including their local index and the rest of their respective object properties, inspect(obj) parses circular references,
// symbols and the like etc into [TYPE/REF TYPE]. Ultimately this should fix our problem.
import { inspect } from "util";

/**
 * This packet is responsible for our local players appearance and location, as well as
 * surrounding players
 * @author ale8k
 */
export default class SyncPlayers81 {
    /**
     * DEBUG MASK 1042
     */
    public maskData = [
        /** appearance mask */
        0, 0, 4716, 1052, 1704, 4151, 4720, 4224, 4759, 1059, 4131, 0, 0, 0, 7, 4, 9, 5, 0, 0x328, 0x337, 0x333, 0x334, 0x335, 0x336, 0x338,
        ...RSString.writeStringToLongBytes37("DEBUG"), 10, 69
        /** end of appearance */
    ];
    /**
     * The bit writer which writes up until the masks
     */
    private _bitWriter = new BitWriter();
    /**
     * The mask instance used to append masks to an existing bit writer
     */
    private _masks = new Masks();
    /**
     * A list of all the masks going to be used in the playerListUpdating array
     */
    private _playersWhoNeedUpdatesMasks: number[][] = [];
    /**
     * The local player sending this packet
     */
    private _localPlayer: Player;
    /**
     * The current logged in list of players
     */
    private _playerList: Player[];
    /**
     * The indexes of each currently logged in player
     */
    private _playerIndex: Set<number>;
    /**
     * The entire player list, excluding our player
     */
    private _filteredPlayerList: Player[];
    /**
     * The list of all players in our region
     */
    private _playersInRegion: Player[];
    /**
     * The list of all players in range
     */
    private _playersInRange: Player[];

    /**
     *
     * @param {Player} player local player
     * @param {Player[]} playerList total list of all player instances
     * @param {Set<number>} playerIndex total list of all connected player indexes
     */
    constructor(localPlayer: Player, playerList: Player[], playerIndex: Set<number>) {
        // General setup
        this._localPlayer = localPlayer;
        this._playerList = playerList;
        this._playerIndex = playerIndex;
        // Player range gathering
        this._filteredPlayerList = this._playerList.filter((player) => {
            return player.localPlayerIndex !== this._localPlayer.localPlayerIndex;
        });
        this._playersInRegion = PlayerHandler.getPlayersInLocalPlayersRegion(this._localPlayer, this._filteredPlayerList);
        this._playersInRange = PlayerHandler.getPlayersInVisibleRange(this._localPlayer, this._playersInRegion);
        // The update procedure
        this.syncLocalPlayerMovement(this._localPlayer);
        this.syncOtherPlayerMovement();
        this.updatePlayerList();
        this.writePlayerSyncMasks();
    }

    /**
     * Determines the movement update type
     * and appends any data it needs to to our bitWriter
     * @param {Player} player local player
     * @returns {SyncPlayers81} a reference to the instance of this packet builder, for use in extension methods
     */
    public syncLocalPlayerMovement(player: Player): SyncPlayers81 {
        const br = this._bitWriter;
        const lp = this._localPlayer;
        const updateOurPlayer = lp.updateOurPlayer ? 1 : 0;
        const updateLocalPlayer = lp.updateLocalPlayer ? 1 : 0;
        br.writeBit(updateOurPlayer);
        if (updateOurPlayer === 1) {
            switch (lp.movementType) {
                case 0:
                    br.writeNumber(0, 2);
                    break;
                case 1:
                    br.writeNumber(1, 2);
                    br.writeNumber(player.direction as number, 3);
                    br.writeBit(updateLocalPlayer); // update mask
                    break;
                case 2:
                    br.writeNumber(2, 2);
                    br.writeNumber(player.direction as number, 3);
                    br.writeNumber(player.direction2 as number, 3);
                    br.writeBit(updateLocalPlayer); // update mask
                    break;
                case 3:
                    br.writeNumber(3, 2); // type 3 - we have a teleport flag to determine that bit
                    br.writeNumber(lp.plane, 2);
                    br.writeBit(1); // always teleported
                    br.writeBit(updateLocalPlayer); // update mask
                    br.writeNumber(lp.y, 7);
                    br.writeNumber(lp.x, 7);
                    break;
            }
        }
        if (updateLocalPlayer === 1 || lp.movementType === 0 && updateOurPlayer === 1) {
            this._playersWhoNeedUpdatesMasks.push(this.maskData); // just debug data
        }
        // Turn player update off for next packet, only an interaction should be turning it back on
        lp.updateLocalPlayer = false;
        // Don't update our player anymore, movetype 0 is for updating our appearance when stood still...
        lp.updateOurPlayer = false;
        return this;
    }
    /**
     * Handles 0 other players movements for now
     * @returns {SyncPlayers81} a reference to the instance of this packet builder, for use in extension methods
     */
    public syncOtherPlayerMovement(): SyncPlayers81 {
        // We gather all players that have loaded in range and write them as other movements to synchronize
        // const playersInLoadedRange: Player[] = [];

        // this._playersInRange.forEach(otherPlayer => {
        //     if (otherPlayer.regionLoaded) {
        //         playersInLoadedRange.push(otherPlayer);
        //     }
        // });

        // this._bitWriter.writeNumber(playersInLoadedRange.length, 8);

        // playersInLoadedRange.forEach(otherPlayer => {
        //     this._bitWriter.writeBit(0);
        // });
        this._bitWriter.writeNumber(0, 8);

        return this;
    }
    /**
     * Writes each player who requires an update to the bitWriter
     * @param playerIndex the list of indexes
     * @param playerList the list of player instances
     * @returns {SyncPlayers81} a reference to the instance of this packet builder, for use in extension methods
     */
    public updatePlayerList(): SyncPlayers81 {
        // Update our players in range
        this._playersInRange.forEach(otherPlayer => {
            const otherX = MovementHandler.getOtherPlayerRelativeXY(this._localPlayer, otherPlayer, "x");
            const otherY = MovementHandler.getOtherPlayerRelativeXY(this._localPlayer, otherPlayer, "y");
            this._bitWriter.writeNumber(otherPlayer.localPlayerIndex, 11); // players index
            // Mask updates
            if (otherPlayer.updateReferencePlayer) {
                this._bitWriter.writeBit(1);
                otherPlayer.updateReferencePlayer = false;
                this._playersWhoNeedUpdatesMasks.push(this.maskData); // just debug data
            } else {
                this._bitWriter.writeBit(0);
            }
            this._bitWriter.writeBit(0); // teleport
            this._bitWriter.writeNumber(otherY, 5);
            this._bitWriter.writeNumber(otherX, 5);
        });
        // End the loop, note: if the playerList is [], then this will fire. I.e., a solo player in a 32x32 area
        this._bitWriter.writeNumber(2047, 11);

        // Because this part requires padding, we're going to pad it off.
        // It requires padding due to the bitaccess being ended here, i.e., it'll begin
        // reading from the next 'full' byte after for the masks.
        while (this._bitWriter.bufferLength % 8 !== 0) {
            this._bitWriter.writeBit(0);
        }
        return this;
    }
    /**
     * Should only be called if mobsAwaitingUpdate > 0
     * @returns {SyncPlayers81} a reference to the instance of this packet builder, for use in extension methods
     */
    public writePlayerSyncMasks(): SyncPlayers81 {
        this._playersWhoNeedUpdatesMasks.forEach(mask => {
            this._bitWriter.writeNumber(0x10, 8);
            // Mask write-order
            // 0x400, 0x100, 0x08, 0x04, 0x80, 0x01, 0x10, 0x02, 0x20, 0x200
            this._masks.append0x10(mask, this._bitWriter);
        });
        return this;
    }
    /**
     * Writes the bitBuffer of our bitWriter into a buffer of bytes
     * and emits it through the socket.
     * @returns {Buffer} the buffer for this packet builder instance
     */
    public getPacket81(): Buffer {
        const payloadLength = this._bitWriter.bufferLength / 8;
        const b = Buffer.alloc(payloadLength + 3); // opcode and plength shrot
        b[0] = 81 + this._localPlayer.outStreamEncryptor.nextKey();
        b.writeInt16BE(payloadLength, 1);
        this._bitWriter.writeBitsToBuffer(b, 3);
        return b;
    }

}
