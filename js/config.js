const isProduction = true;
isProduction && (console.log = function() {});
