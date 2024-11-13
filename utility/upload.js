const multer = require('multer');
const path = require('path');



// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public/uploads'); // Path to store the uploaded images
    },
    filename: (req, file, cb) => {
        
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Image filter (only JPEG, JPG, PNG)
const imageFilter = (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    
    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Error: Images Only!'));
    }
};

// Initialize multer with storage and file filter
const upload = multer({ 
    storage: storage, 
    fileFilter: imageFilter 
});



// Filter to allow only image files
// const imageFilter = (req, file, cb) => {
//     const filetypes = /jpeg|jpg|png/;
//     const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
//     const mimetype = filetypes.test(file.mimetype);
    
//     if (mimetype && extname) {
//         return cb(null, true);
//     } else {
//         cb('Error: Images Only!');
//     }
// };


// // Multer configuration for local storage
// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, './public/uploads'); // Folder where images are stored
//     },
//     filename: (req, file, cb) => {
//         const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//         cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
//     }
// });


// Configure multer to handle up to 4 images

module.exports = {
    storage,
    imageFilter,
    upload
    // Set up storage engine for images
    // const storage = multer.diskStorage({
    //     destination: (req, file, cb) => {
    //         cb(null, 'uploads/'); // folder to store images
    //     },
    //     filename: (req, file, cb) => {
    //         cb(null, `${Date.now()}_${file.originalname}`);
    //     }
    // });
}