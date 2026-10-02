module.exports = (req, res, next) => {
    
    const usager = req.session?.utilisateur;    
    if (usager) {
        res.locals.utilisateur = usager;
        res.locals.estAuthentifie = true;
        res.locals.estAdmin = usager.administrateur === true;
    } else {
        res.locals.estAuthentifie = false;
        res.locals.estAdmin = false;
    }    
    next();
};