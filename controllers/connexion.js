const UsagerModel = require('../models/UsagerModel.js');
const bcrypt = require('bcryptjs');

module.exports = {
    
    get: (req, res) => {        
        res.render('connexion');
    },

    post: async (req, res) => {
        let message = "";
        let erreur = false;        
        try {
            const { code, motDePasse } = req.body;            
            if (!code || !motDePasse) {
                erreur = true;
                message = 'Code ou mot de passe incorrect';
            }
            
            if (!erreur) {
                const usager = await UsagerModel.getByCode(code);
                
                if (usager === null) {
                    erreur = true;
                    message = 'Code ou mot de passe incorrect';
                }   

                if (!erreur && usager.bloque) {
                    erreur = true;
                    message = 'Ce compte est bloqué. Veuillez contacter la banque';
                }

                if (!erreur && !req.guichetEtat && !usager.administrateur) {
                    erreur = true;
                    message = 'Le guichet est fermé actuellement';
                }
                
                if (!erreur) {                   
                    if (!await bcrypt.compare(motDePasse, usager.password_hash)) {
                        erreur = true;
                        const nouvellesTentatives = usager.tentatives + 1;                        
                        if (nouvellesTentatives >= 3) {
                            await UsagerModel.setBloque(usager.id);
                            message = 'Ce compte est bloqué. Veuillez contacter la banque';
                        } else {
                            await UsagerModel.updateTentatives(usager.id, nouvellesTentatives);
                            const tentativesRestantes = 3 - nouvellesTentatives;
                            message = `Code ou mot de passe incorrect. Tentative(s) restante(s): ${tentativesRestantes}`;
                        }
                    } else {
                        await UsagerModel.updateTentatives(usager.id, 0);
                        req.session.utilisateur = {
                            id: usager.id,
                            administrateur: Boolean(usager.administrateur),
                            prenom: usager.prenom,
                            nom: usager.nom
                        };                        
                        req.session.save(err => {
                            if (err) {
                                erreur = true;
                            }
                        });
                    }
                }
            }            
            req.flash('messages', message);
            if (erreur) {
                req.flash('donnees', req.body);                
                return res.redirect('/connexion');
            } else {
                return res.redirect('/');
            }
        } catch (error) {
            if (error.sqlMessage){
                message = error.sqlMessage;
            }else{
                message = error;
            }
            req.flash('messages', message);
            req.flash('donnees', req.body);
            return res.redirect('/connexion');
        }
    }
};