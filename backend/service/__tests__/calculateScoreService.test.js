const { calculateScore, getPlayerPool } = require('../calculateScoreService');

describe('test calculateScore', () => {
    it('should return correct result with level / 10', () => {
        const result = calculateScore({
            user_level: 13
        }, "level / 10");
        expect(result).toBe(1);
    });

    it('should return correct result with level + 2', () => {
        const result = calculateScore({
            user_level: 17
        }, "level + 2");
        expect(result).toBe(19);
    });
});

describe('test getPlayerPool', () => {
    it('should return correct result with `${country}`', () => {
        const result = getPlayerPool({
            user_country: "FI"
        }, "`${country}-pool`");
        expect(result).toBe("FI-pool");
    });

    it('should return correct result with `${country}`', () => {
        const result = getPlayerPool({
            user_country: "SE"
        }, "`${country}-group`");
        expect(result).toBe("SE-group");
    });
});