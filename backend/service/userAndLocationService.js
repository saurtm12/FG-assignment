
// this cant return empty as at least this endpoint is serving.
// basic algorithm for choosing the promoted server serving client game
// (I choosed that the country matched)
// This query should at least return 1 for advertised server 
// (i.e, if country not matched, then closest server with status active should be responsible)
// Advanced algorithm could be implemented, for example, 1 country could have multiple hosts
const GET_PROMOTED_SERVER_AND_PLAYER = `
SELECT 
    u.id AS user_id,
    u.name AS user_name,
    u.level AS user_level,
    u.country AS user_country,
    s.advertised_address AS server_address
FROM 
    user u
JOIN 
    server s 
ON 
    u.country = s.country
WHERE 
    u.id = ? AND s.status = 'active'
LIMIT 1;`

async function getUserandPromotedInstanceForNewGame(db, userId) {
    const [[userAndPromotedInstance]] = await db.execute(GET_PROMOTED_SERVER_AND_PLAYER, [userId]);
    return userAndPromotedInstance;
}

module.exports = { getUserandPromotedInstanceForNewGame }