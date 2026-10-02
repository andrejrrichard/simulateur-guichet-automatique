const CompteModel = require('../models/CompteModel.js');

module.exports = {
    
    comptesGet: async (req, res) => {
        let message = "";
        try {
            res.render('client/comptes', {
                typesCompte: await CompteModel.getCompteTypesClient(),
                comptes: await CompteModel.getComptesByUserId(req.session.utilisateur.id)                
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
            const {typeCompteId} = req.body;
            if (!typeCompteId) {
                erreur = true;
                message = 'Veuillez sélectionner un type de compte';
            }            
            if (!erreur) { 
                await CompteModel.createCompteClient(req.session.utilisateur.id, typeCompteId);
                message = 'Compte ajouté';
            }
            req.flash('messages', message);
            if(erreur){                
                req.flash('donnees', req.body);
                return res.redirect('/client/comptes');
            }else{
                res.redirect('/client/comptes');
            } 
        } catch (error) {
            if (error.sqlMessage){
                message = error.sqlMessage;
            }else{
                message = error;
            }
            req.flash('messages', message);
            req.flash('donnees', req.body);
            return res.redirect('/client/comptes');
        }
    }
};