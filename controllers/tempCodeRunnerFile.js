 const crypto= require('crypto')
 
 const generateUniqueCode = () => {
                return `REF-${crypto.randomBytes(4).toString("hex").toUpperCase()}`; 
            };
            console.log(generateUniqueCode());
            