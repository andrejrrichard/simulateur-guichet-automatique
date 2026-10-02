const bcrypt = require('bcryptjs');
const pool = require('./database.js');

async function load() {
    try {        
        let adminId = null;
        const [adminRows] = await pool.execute(
            'SELECT id FROM usager WHERE code = "Admin"'
        );        
        if (adminRows.length === 0) {
            console.log("Création de l'usager Admin");
            const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
            const [result] = await pool.execute(
                `INSERT INTO usager (code, password_hash, administrateur)
                 VALUES (?, ?, ?)`,
                ['Admin', hash, true]
            );
            adminId = result.insertId;  
        } else {
            adminId = adminRows[0].id;  
        }

        const comptes = [
            {type: 'BANQUE', solde: 110000.00},
            {type: 'GUICHET', solde: 0.00},
            {type: 'DEPOT', solde: 0.00}
        ];        
        for (const compte of comptes) {
            const [typeRows] = await pool.execute(
                'SELECT id FROM compte_type WHERE code = ?',
                [compte.type]
            );            
            if (typeRows.length === 0) continue;
            
            const typeId = typeRows[0].id;
            const [existingCompte] = await pool.execute(
                `SELECT id FROM compte 
                 WHERE usager_id = ? AND compte_type_id = ?`,
                [adminId, typeId]
            );            
            if (existingCompte.length === 0) {
                console.log(`Création du compte: ${compte.type}`);
                await pool.execute(
                    `INSERT INTO compte (usager_id, compte_type_id, numero, solde)
                     VALUES (?, ?, ?, ?)`,
                    [adminId, typeId, compte.type, compte.solde]
                );
            }
        }
    } catch (error) {
        console.log('Erreur initDatabase(): ', error.message);
        throw error;
    }
}

module.exports = {load};