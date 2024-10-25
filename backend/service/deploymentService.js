function getRegisterAcitiveInstanceWorker(db, cfg) {
    let isRegisteredInstance = false;
    return {
        runner: async function () {
            let [rows, fields] = await db.execute("SELECT * FROM server WHERE instance_name = ? LIMIT 1", [cfg.instanceId])
            if (rows.length !== 0) {
                if (rows[0]["status"] === 'active') {
                    throw new Error("Error when joining server group: instance is already active");
                }
                else {
                    [rows, fields] = await db.execute("UPDATE server SET status = ? WHERE instance_name = ?", ["active", cfg.instanceId])
                    isRegisteredInstance = true;
                }
            } else {
                const row = [cfg.instanceId, cfg.instanceCountry, cfg.advertisedAddress, "active"];
                [rows, fields] = await db.execute("INSERT INTO `server` (instance_name, country, advertised_address, status) VALUES (?, ?, ?, ?)", row)
                isRegisteredInstance = true;
            }
    
            console.log("Registerd to database");
        },
        closer: async function () {
            try {
                console.log("Unregistering instance");
                if (isRegisteredInstance) {
                    await db.execute("UPDATE server SET status = ? WHERE instance_name = ?", ["inactive", cfg.instanceId]);
                    console.log("Unregistered instance")
                }
            }
            catch (err) {
                console.log("Error closing database", err)
            }
        }
    }
}

module.exports = { getRegisterAcitiveInstanceWorker }
