"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const mongoose_1 = __importDefault(require("mongoose"));
const mongoose_2 = require("mongoose");
mongoose_1.default.set('strictQuery', true);
const app = (0, express_1.default)();
const port = 3010;
app.use((0, morgan_1.default)('dev'));
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        yield mongoose_1.default.connect('mongodb://localhost:27017/aram-matches');
        console.log('Connected to DB');
        app.get('/stats/:summonerName', (req, res) => __awaiter(this, void 0, void 0, function* () {
            const response = (yield Match.count({ 'info.participants.summonerName': req.params.summonerName })) + '';
            console.log('Match: ', response);
            res.send(response).status(200);
        }));
        app.listen(port, () => console.log(`Server listening on port ${port}`));
    });
}
main();
const matchSchema = new mongoose_2.Schema({
    metadata: {
        dataVersion: String,
        matchId: { type: String, index: { unique: true } },
        participants: [String]
    },
    info: {},
});
const Match = mongoose_1.default.model('Match', matchSchema);
