const User=require('../models/userModel')
const Products=require('../models/productModel')
const Categories = require("../models/categoryModel")
const Order = require('../models/orderModels')
const orderItem = require('../models/orderItemModel')
const {imageFilter,upload} = require('../utility/upload')
const fs = require('fs');
const path = require('path');
const sizeVariationschema =require('../models/productModel')
const { log } = require('console');
const { renderOrderdetails } = require('./userControllers')




const renderDashboard = async(req,res)=>{
    res.render('Dashboard')
}


const renderUsers=async(req,res)=>{
    const userdata= await User.find()
    res.render('userList',{user:userdata})
    
}

const renderProduct = async (req,res)=>{
    const productData= await Products.find()
    res.render('productList',{data:productData})
}


const renderViewProduct = async(req,res)=>{
   const id= req.params.id
   const productData= await Products.findById(id)
   res.render('viewProduct',{data:productData})
}

const renderAddProduct = async (req, res) => {
    try {
        const categoryData = await Categories.find();
        const errorMessages = req.flash('error');
        const successMessages = req.flash('success');
        res.render('addProducts', {
            data: categoryData,
            messages: {
                error: errorMessages,
                success: successMessages
            }
        });
    } catch (error) {
        console.error("Error fetching categories:", error);
        req.flash('error', 'An error occurred while fetching categories.');
        res.redirect('/admin/newproducts');
    }
};



const renderCategories =async(req,res)=>{
    const categorydata = await Categories.find()
    return  res.render('Categories',{cat:categorydata});   
}

const renderEditCategories = async (req,res)=>{
    const id= req.params.id
    const categoryData= await Categories.findOne({_id:id})
    res.render('editCategory',{data:categoryData})
}

const renderEditProduct = async (req, res) => {
  const productId = req.params.id;

  if (!productId) {
      req.flash('error', 'Product ID is missing.');
      return res.redirect('/admin/products');
  }

  try {
      const productData = await Products.findById(productId);
      if (!productData) {
          req.flash('error', 'Product not found.');
          return res.redirect('/admin/products');
      }

      const categoryData = await Categories.find();
      const messages = {
          error: req.flash('error'),
          success: req.flash('success'),
      };
      res.render('editProductDetails', { data: productData, categoryData: categoryData, messages });
  } catch (error) {
      console.log(error.message);
      req.flash('error', 'Something went wrong.');
      return res.redirect('/admin/products');
  }
};

  const archiveProduct= async(req,res)=>{
    
    const id= req.params.id
    try {
      await Products.findByIdAndUpdate({_id:id},{$set:{status:true}})
      return res.redirect('/admin/products')
    } catch (error) {
      console.log(error)
    }
  }
  
  const unarchiveProduct = async (req,res)=>{
    try {
      const id=req.params.id
      console.log(id);
      await Products.findByIdAndUpdate({_id:id},{$set:{status:false}})
      console.log('changed');
      return res.redirect('/admin/products')  
    } catch (error) {
      console.log(error)
    }
  }
  
  const blockUSer= async(req,res)=>{
    const id= req.params.id
    console.log(id);
    
    try {
     await User.findByIdAndUpdate({_id:id},{$set:{blocked:true}})
      console.log('blocked'); 
      return res.redirect('/admin/users')  
    } catch (error) {
      console.log(error);  
    }
  }

  const unblockUser = async (req,res)=>{
    
    const id=req.params.id
    console.log(id);
    try {
      await User.findByIdAndUpdate({_id:id},{$set:{blocked:false}})
      return res.redirect('/admin/users')
    } catch (error) {
      console.log(error);
    }
  }

const addCategory = async (req, res) => {
  try {
      const { name, description } = req.body;
      console.log(name);
      
      const cat= await Categories.findOne({name: { $regex: `^${name}$`, $options: 'i' } })
      if(cat){
      
        return res.status(500).json({success:false,message:"category with same name exist"})
      }
      const category = new Categories({
          name: name,
          description: description
      });
      
      await category.save();
      return res.status(200).json({ success: true, message: 'Category added successfully!' });
  } catch (error) {
      console.error("Error adding category:", error);
      return res.status(500).json({ success: false, message: 'An error occurred while adding the category.' });
  }
};


const editCategory = async (req, res) => {
    const id= req.params.id
    const { name, description } = req.body;
    log(name)
    try {
      const exist = await Categories.findOne({ name: name });
      if (exist && exist._id.toString() !== id) {
        return res.status(500).json({success:false,message:"category with same name exist"})
      } else {
        const categoryData = await Categories.findByIdAndUpdate(
          { _id: id },
          { $set: { name: name, description: description } }
        );
  
        if (categoryData) {
          return res.status(200).json({ success: true, message: 'Category Updated successfully!' });        }
      }
  
    } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success: false, message: 'An error occurred while updating the category.' });
    }
  };

  const editProduct = async (req, res) => {
    const id = req.params.id;

    try {
        const { category, title, sleeve, material, color, description, sizes, prices, stocks, removedImages } = req.body;
      console.log(sleeve);
      
        const productData = await Products.findById(id);
        if (!productData) {
            req.flash('error', 'Product not found.');
            return res.redirect('/admin/products');
        }

        // Handle removed images
        let updatedImages = productData.images || [];
        if (removedImages && Array.isArray(removedImages)) {
            removedImages.forEach((img) => {
                const imgPath = path.join(__dirname, "../uploads", img);
                if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
            });
            updatedImages = updatedImages.filter(img => !removedImages.includes(img));
        }

        // Handle new images
        const newImagePaths = req.files ? req.files.map(file => file.filename) : [];
        updatedImages.push(...newImagePaths);


        // Create size variations array
        const sizeVariations = sizes.map((size, index) => ({
            size,
            price: parseFloat(prices[index]),
            stock: parseInt(stocks[index], 10)
        }));

        // Update the product
        await Products.findByIdAndUpdate(id, {
            $set: {
                name:title,
                description,
                category,
                sleeveLength:sleeve,
                material,
                color,
                sizeVariations, // Update size variations
                images: updatedImages,
            },
        });

        req.flash('success', 'Product updated successfully.');
        res.redirect(`/admin/products/`);
    } catch (error) {
        console.error(error.message);
        req.flash('error', 'Something went wrong. Please try again.');
        return res.redirect(`/admin/products/edit/${id}`);
    }
};


  
//   const editProduct = async (req, res) => {
//     try {
//         const { category, title, sleeve, material, color, size, description, price, stock, gender, removedImages } = req.body;
//         const id = req.params.id;
//         console.log(removedImages);
        
//         // Fetch existing product data
//         const productData = await product.findById(id);
//         let updatedImages = productData.images || [];

//         // Remove selected existing images from the server
//         if (removedImages && Array.isArray(removedImages)) {
//             removedImages.forEach((img) => {
//                 const imgPath = path.join(__dirname, "../uploads", img);
//                 if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath); // Remove from server
//             });
//             updatedImages = updatedImages.filter(img => !removedImages.includes(img));
//         }
//         const numericPrice = parseFloat(price);
//         const numericStock = parseInt(stock, 10);
//         // Add newly uploaded images
//         const newImagePaths = req.files ? req.files.map(file => file.filename) : [];
//         updatedImages.push(...newImagePaths);

//         // Update product fields and images in the database
//         await product.findByIdAndUpdate(id, {
//             $set: {
//               name: title,
//               description: description || '',
//               price: numericPrice,
//               category: category,
//               sleeveLength: sleeve || '',
//               stock: numericStock,
//               color: color || '',
//               size: size || '',
//               gender: gender || '',
//               material: material || '',
//                 images: updatedImages,
//             },
//         });

//         req.flash('success', 'Product updated successfully.');
//         res.redirect(`/admin/products/`);
//     } catch (error) {
//         console.error(error.message);
//         req.flash('error', 'Something went wrong. Please try again.');
//         res.redirect(`/admin/products/edit/${req.params.id}`);
//     }
// };

  
  
const deleteCategory= async(req,res)=>{
    try {
        const id =req.query.id
        await Categories.deleteOne({_id:id})
        return res.redirect('/admin/categories')
    } catch (error) {
        console.log(error.message);
        
    }
    
}


const addProduct = async (req, res) => {
  try {
      const { category, title, sleeve, material, color, sizes, description, prices, stocks, gender } = req.body;
      
      if (!title || !category || !sizes || !prices || !stocks) {
          req.flash('error', 'Title, category, sizes, prices, and stocks are required.');
          return res.redirect('/admin/newproducts');
      }

      const Pname = await Products.findOne({ name: title });
      if (Pname) {
          req.flash('error', 'A Product with the same name exists');
          return res.redirect('/admin/newproducts');
      }
      const sizeVariations = sizes.map((size, index) => {
        const price = parseFloat(prices[index]);
        const stock = parseInt(stocks[index], 10);
        if (isNaN(price) || isNaN(stock)) {
            throw new Error(`Invalid price or stock for size: ${size}`);
        }

        return {
            size: size,
            price: price,
            stock: stock
        };
    });

      let imagePaths = [];
      if (req.files && req.files.length > 0) {
          imagePaths = req.files.map(file => file.filename);
      }

      const product = new Products({
          name: title,
          description: description || '',
          category: category,
          sleeveLength: sleeve || '',
          color: color || '',
          gender: gender || '',
          material: material || '',
          createdAt: new Date().toISOString(),
          images: imagePaths,
          sizeVariations: sizeVariations 
      });
    // const product = await Products.find()
    //   console.log("product is .....",product)

      await product.save();

      req.flash('success', 'Product added successfully.');
      return res.redirect('/admin/newproducts');

  } catch (error) {
      console.error("Error adding product:", error);
      req.flash('error', 'An error occurred while adding the product.');
      return res.redirect('/admin/newproducts');
  }
};
// const addProduct = async (req, res) => {
//     try {
//         const { category, title, sleeve, material, color, size, description, price, stock, gender } = req.body;
//         // if (!title || !price || !category|| !description || !price ) {
//         //     req.flash('error', 'Title, price, category ,description and  price are required.');
//         //     return res.redirect('/admin/newproducts');
//         // }
//         const Pname= await Products.findOne({name:title})
//         if(Pname){
//           req.flash('error', 'A Product with same name exist');
//           return res.redirect('/admin/newproducts')
//         }
//         const numericPrice = parseFloat(price);
//         const numericStock = parseInt(stock, 10);
//         const date = getFormattedDate(Date.now());
//         let imagePaths = [];
//         if (req.files && req.files.length > 0) {
//             imagePaths = req.files.map(file => file.filename);
//         }

//         const product = new Products({
//             name: title,
//             description: description || '',
//             price: numericPrice,
//             category: category,
//             sleeveLength: sleeve || '',
//             stock: numericStock,
//             color: color || '',
//             size: size || '',
//             gender: gender || '',
//             material: material || '',
//             createdAt: date,
//             images: imagePaths 
//         });
//         await product.save();
//         req.flash('success', 'Product added successfully.');
//         return res.redirect('/admin/newproducts');

//     } catch (error) {
//         console.error("Error adding product:", error);
//         req.flash('error', 'An error occurred while adding the product.');
//         return res.redirect('/admin/newproducts');
//     }
// };




const getFormattedDate = (date) => {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0'); 
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

const renderAdminOrders = async (req,res)=>{
  try {
      const orders = await Order.find()
    .populate({
        path: 'items',
        populate: {
            path: 'productId',
            model: 'Product'
        }
    })
    .populate({
        path: 'user', 
        model: 'User'
    })
    .sort({ createdAt: -1 });
    
      res.render('orderslist',{orders})
  } catch (error) {
      console.log(error)
  }
}

const renderadminOrderdetails = async(req,res)=>{
  const id= req.query.id

  try {
    const order = await Order.findById(id)
  .populate({
      path: 'items',
      populate: {
          path: 'productId',
          model: 'Product'
      }
  })
  .populate({
      path: 'user', 
      model: 'User'
  })
  .sort({ createdAt: -1 });
  console.log(order);
  
    res.render('adminOrdersdetail',{order})
} catch (error) {
    console.log(error)
}
}

const changeOrderStatus= async(req,res)=>{
  const id= req.query.id
  const status=req.body.status
  console.log(status);
  
  try {
    const orderUpdate= await Order.findByIdAndUpdate({_id:id},{$set:{orderStatus:status}})
    const itemUpdatePromises = orderUpdate.items.map(itemId => {
            return orderItem.findByIdAndUpdate(
                itemId,
                { $set: { orderStatus: status } }
            );
        })
        await Promise.all(itemUpdatePromises);
        return res.redirect('/admin/order-list')
  } catch (error) {
    console.log(error);
    
  }
}

module.exports={
    renderDashboard,
    renderUsers,
    renderProduct,
    renderAddProduct,
    addProduct,
    renderCategories,
    addCategory,
    deleteCategory,
    renderEditCategories,
    editCategory,
    renderEditProduct,
    editProduct,
    renderViewProduct,
    getFormattedDate,
    blockUSer,
    unblockUser,
    archiveProduct,
    unarchiveProduct,
    renderAdminOrders,
    renderadminOrderdetails,
    changeOrderStatus
}