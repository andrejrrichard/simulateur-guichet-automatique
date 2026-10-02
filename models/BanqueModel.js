const pool = require('../config/database.js');

let banqueData = null;

const BanqueModel = {

    _loadData: async () => {
        try {
            const [rows] = await pool.query('SELECT * FROM vue_compte_banque');
            banqueData = rows[0] || null;
        } catch (error) {
            console.log('Erreur BanqueModel.loadData:', error);
            throw error;
        }
    },

    getSolde: async () => {
        try {
            const [rows] = await pool.query('SELECT solde FROM vue_compte_banque');
            return rows[0]?.solde || 0;
        } catch (error) {
            console.log('Erreur BanqueModel.getSolde:', error);
            throw error;
        }
    },

    getCompteId: async () => {
        try {
            if (!banqueData) await BanqueModel._loadData();
            return banqueData?.id || null;
        } catch (error) {
            console.log('Erreur BanqueModel.getCompteId:', error);
            throw error;
        }
    },

    getCompteUsagerId: async () => {
        try {
            if (!banqueData) await BanqueModel._loadData();
            return banqueData?.usager_id || null;
        } catch (error) {
            console.log('Erreur BanqueModel.getCompteUsagerId:', error);
            throw error;
        }
    }
};

module.exports = BanqueModel;