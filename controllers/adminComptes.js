const UsagerModel = require('../models/UsagerModel.js');
const CompteModel = require('../models/CompteModel.js');

module.exports = {

    comptesGet: async (req, res) => {
        let message = "";
        try {
            res.render('admin/comptes', {
                usagers: await UsagerModel.getAll(true),
                compteTypes: await CompteModel.getCompteTypesClient(),
                comptes: await CompteModel.getComptesClients()                
            });
        } catch (error) {
            if (error.sqlMessage){
                message = error.sqlMessage;
            }else{
                message = error;
            }
            req.flash('messages', message);
            res.redirect('/');
        }
    },

    comptesPost: async (req, res) => {        
        let message = "";
        let erreur = false;        
        try {            
            if (req.guichetEtat) {
                const {typeCompteId, usagerId} = req.body;

                if (!usagerId) {
                    erreur = true;
                    message = 'Veuillez sélectionner un client';
                }

                if (!erreur && !typeCompteId) {
                    erreur = true;
                    message = 'Veuillez sélectionner un type de compte';
                }
                
                if (!erreur){
                    await CompteModel.createCompteClient(usagerId, typeCompteId);
                    message = 'Compte ajouté';
                }
            }else {
                message = 'Le guichet est fermé actuellement';
            }
            req.flash('messages', message);
            if(erreur){                
                req.flash('donnees', req.body);
                return res.redirect('/admin/comptes');
            }else{
                res.redirect('/admin/comptes');
            } 

        } catch (error) {
            if (error.sqlMessage){
                message = error.sqlMessage;
            }else{
                message = error;
            }
            req.flash('messages', message);
            req.flash('donnees', req.body);
            return res.redirect('/admin/comptes');
        }
    }
};