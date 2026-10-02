const pool = require('../config/database.js');

const UsagerModel = {

    getAll: async (clientsSeulement = false) => {
        try {
            let query = 'SELECT * FROM vue_usagers';
            if (clientsSeulement) query += ' WHERE administrateur = FALSE';
            const [rows] = await pool.query(query);
            return rows;
        } catch (error) {
            console.log('Erreur UsagerModel.getAll:', error);
            throw error;
        }
    },

    getByCode: async (code) => {
        try {
            const [rows] = await pool.query(
                'SELECT * FROM usager WHERE code = ?',
                [code]
            );
            return rows[0] || null;
        } catch (error) {
            console.log('Erreur UsagerModel.getByCode:', error);
            throw error;
        }
    },

    createClient: async (client) => {
        try {
            const {code, passwordHash, courriel, prenom, nom, telephone} = client;
            await pool.execute(
                'CALL creer_nouveau_client(?, ?, ?, ?, ?, ?)',
                [code, passwordHash, courriel || null, prenom || null, nom || null, telephone || null]
            );
        } catch (error) {
            console.log('Erreur UsagerModel.createClient:', error);
            throw error;
        }
    },

    toggleBloque: async (usagerId) => {
        try {
            await pool.query('CALL toggle_client_bloque(?)', [usagerId]);
        } catch (error) {
            console.log('Erreur UsagerModel.toggleBloque:', error);
            throw error;
        }
    },

    updateTentatives: async (usagerId, tentatives) => {
        try {
            await pool.query(
                'UPDATE usager SET tentatives = ? WHERE id = ?',
                [tentatives, usagerId]
            );
        } catch (error) {
            console.log('Erreur UsagerModel.updateTentatives:', error);
            throw error;
        }
    },

    setBloque: async (usagerId) => {
        try {
            await pool.query(
                'UPDATE usager SET bloque = 1 WHERE id = ?',
                [usagerId]
            );
        } catch (error) {
            console.log('Erreur UsagerModel.setBloque:', error);
            throw error;
        }
    }
};

module.exports = UsagerModel;