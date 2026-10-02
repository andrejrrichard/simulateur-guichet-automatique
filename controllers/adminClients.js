const UsagerModel = require('../models/UsagerModel.js');
const bcrypt = require('bcryptjs');

module.exports = {

    clientsGet: async (req, res) => {        
        let message = "";
        try {
            res.render('admin/clients', {
                usagers: await UsagerModel.getAll(true)
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

    clientsPost: async (req, res) => {        
        let message = "";
        let erreur = false;

        try {
            const {code, password, courriel, prenom, nom, telephone} = req.body;
            
            if (!code || !password) {
                erreur = true;
                message = 'Tous les champs obligatoires (*) doivent être remplis';
            }else{
                const passwordHash = await bcrypt.hash(password, 10);
                await UsagerModel.createClient({code, passwordHash, courriel, prenom, nom, telephone});     
                message = 'Client ajouté';
            }
            
            req.flash('messages', message);
            if(erreur){                
                req.flash('donnees', req.body);
                return res.redirect('/admin/clients');
            }else{
                res.redirect('/admin/clients');
            }  

        } catch (error) {
            if (error.sqlMessage){
                message = error.sqlMessage;
            }else{
                message = error;
            }
            req.flash('messages', message);
            req.flash('donnees', req.body);
            return res.redirect('/admin/clients');
        }
    },

    toggleBloque: async (req, res) => {
        let message = "";
        try {
            const usagerId = req.params.id; 
            if (req.guichetEtat) {
                if (!usagerId || isNaN(usagerId)) {
                    req.flash('messages', 'Aucun client trouvé');
                    return res.redirect('/admin/clients');
                } 
                await UsagerModel.toggleBloque(usagerId);
            }
            return res.redirect('/admin/clients');
            
        } catch (error) {
            if (error.sqlMessage){
                message = error.sqlMessage;
            }else{
                message = error;
            }
            req.flash('messages', error);
            req.flash('donnees', req.body);
            return res.redirect('/');
        }
    }
};