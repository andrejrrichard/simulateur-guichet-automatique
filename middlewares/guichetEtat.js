const GuichetModel = require('../models/GuichetModel.js');

module.exports = {
    
    injecterEtatGuichet: async (req, res, next) => {
        try {
            const guichetEtat =  await GuichetModel.getEtat();
            // Injecter dans la requête pour les routes
            req.guichetEtat = guichetEtat;
            
            // Injecter dans les variables locales pour les views
            res.locals.guichetEtat = guichetEtat;            
            next();

        } catch (error) {
            // En cas d'erreur, on définit par défaut le guichet fermé
            req.guichetEtat = false;
            res.locals.guichetEtat = false;
            next();
        }
    }
};