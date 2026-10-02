module.exports = (req, res, next) => {
    
    let messages = req.flash('messages');
    if (!Array.isArray(messages)) {
        messages = messages ? [messages] : [];
    }    
    res.locals.messages = messages;
    res.locals.donnees = req.flash('donnees')[0] || {};
    next();
};