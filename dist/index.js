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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
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
            const response = (yield Match.count({
                'info.participants.summonerName': req.params.summonerName,
            })) + '';
            console.log('Match: ', response);
            res.send(response).status(200);
        }));
        app.get('/champstats/:summonerName', (req, res) => __awaiter(this, void 0, void 0, function* () {
            var e_1, _a;
            var _b;
            const response = {};
            try {
                for (var _c = __asyncValues(Match.find({
                    'info.participants.summonerName': req.params.summonerName,
                })), _d; _d = yield _c.next(), !_d.done;) {
                    const doc = _d.value;
                    for (const { summonerName, championName, win } of (_b = doc.info) === null || _b === void 0 ? void 0 : _b.participants) {
                        if (summonerName === req.params.summonerName) {
                            if (typeof championName === 'string' && typeof win === 'boolean') {
                                if (!response[championName]) {
                                    response[championName] = { champion: championName, games: 0, wins: 0 };
                                }
                                response[championName].games++;
                                if (win)
                                    response[championName].wins++;
                            }
                        }
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) yield _a.call(_c);
                }
                finally { if (e_1) throw e_1.error; }
            }
            let champData = [];
            for (const champion in response) {
                champData.push(response[champion]);
            }
            champData.sort((a, b) => b.games - a.games);
            res.send(champData);
        }));
        app.listen(port, () => console.log(`Server listening on port ${port}`));
    });
}
main();
const matchSchema = new mongoose_2.Schema({
    metadata: {
        dataVersion: String,
        matchId: { type: String, index: { unique: true } },
        participants: [String],
    },
    info: {},
});
const Match = mongoose_1.default.model('Match', matchSchema);
