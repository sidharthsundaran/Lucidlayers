const User=require('../models/userModel')
const Products=require('../models/productModel')
const Categories = require("../models/categoryModel")
const Order = require('../models/orderModels')
const orderItem = require('../models/orderItemModel')
const Offers= require('../models/offerModel')
const Coupons = require('../models/discountModel')
const fs = require('fs');
const path = require('path');
const { log } = require('console');
const Wallet = require('../models/walletModel')
const Transactions =require('../models/transactions')
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');





const renderDashboard = async (req, res) => {
    try {
        const totalRevenue = await Order.aggregate([
            { $group: { _id: null, total: { $sum: "$totalPrice" } } }
        ]);

        const totalOrders = await Order.countDocuments();
        const totalProducts = await Products.countDocuments();
        
        const totalCategories= await Categories.countDocuments()
        const monthlyEarnings = await Order.aggregate([
          {
              $match: {
                  createdAt: {
                      $gte: new Date(new Date().setDate(1)), // Start of the month
                      $lt: new Date(new Date().setMonth(new Date().getMonth() + 1)) // Start of next month
                  }
              }
          },
          {
              $group: {
                  _id: null,
                  total: { $sum: "$totalPrice" }
              }
          }
      ]);
      const topProducts = await Order.aggregate([
        {
            $lookup: {
                from: 'orderitems', // Match the correct collection name for OrderItem
                localField: 'items', // Reference in Order
                foreignField: '_id', // Field in OrderItem
                as: 'orderItems',
            },
        },
        { $unwind: '$orderItems' }, // Flatten the array of orderItems
        {
            $group: {
                _id: '$orderItems.productId', // Group by productId
                totalQuantity: { $sum: '$orderItems.quantity' }, // Sum up quantities
            },
        },
        { $sort: { totalQuantity: -1 } }, // Sort by quantity in descending order
        { $limit: 10 }, // Limit to top 10 products
        {
            $lookup: {
                from: 'products', // Match the products collection name
                localField: '_id', // Product ID from grouping
                foreignField: '_id', // Product ID in products collection
                as: 'productDetails',
            },
        },
        { $unwind: '$productDetails' }, // Flatten the product details array
        {
            $project: {
                name: '$productDetails.name', // Project product name
                totalQuantity: 1, // Project totalQuantity
                images: '$productDetails.images', // Project images
            },
        },
    ]);
    
    

    // Fetch top 10 best-selling categories
    const topCategories = await Order.aggregate([
      {
          $lookup: {
              from: 'orderitems', 
              localField: 'items', 
              foreignField: '_id', 
              as: 'orderItems',
          },
      },
      { $unwind: '$orderItems' }, 
      {
          $lookup: {
              from: 'products', 
              localField: 'orderItems.productId', 
              foreignField: '_id', 
              as: 'productDetails',
          },
      },
      { $unwind: '$productDetails' }, 
      {
          $group: {
              _id: '$productDetails.category', 
              totalQuantity: { $sum: '$orderItems.quantity' }, 
          },
      },
      { $sort: { totalQuantity: -1 } }, 
      { $limit: 10 }, 
      {
          $project: {
              name: '$_id', 
              totalQuantity: 1, 
          },
      },
  ]);
      
    
      res.render('dashboard', {
          totalRevenue: totalRevenue[0]?.total || 0,
          totalOrders: totalOrders,
          totalProducts: totalProducts,
          totalCategories,
          monthlyEarnings: monthlyEarnings[0]?.total || 0,
          bestSellingProducts: topProducts,
          bestSellingCategories: topCategories,
      });
    } catch (error) {
        console.error('Error rendering dashboard:', error);
        res.status(500).send('Internal Server Error');
    }
};


const renderUsers=async(req,res)=>{
    const userdata= await User.find()
    res.render('userList',{user:userdata})
    
}

const renderProduct = async (req,res)=>{
    const productData= await Products.find()
    res.render('productlist',{data:productData})
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
    return  res.render('categories',{cat:categorydata});   
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

        let updatedImages = productData.images || [];
        if (removedImages && Array.isArray(removedImages)) {
            removedImages.forEach((img) => {
                const imgPath = path.join(__dirname, "../uploads", img);
                if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
            });
            updatedImages = updatedImages.filter(img => !removedImages.includes(img));
        }

        const newImagePaths = req.files ? req.files.map(file => file.filename) : [];
        updatedImages.push(...newImagePaths);


        const sizeVariations = sizes.map((size, index) => ({
            size,
            price: parseFloat(prices[index]),
            stock: parseInt(stocks[index], 10)
        }));

        await Products.findByIdAndUpdate(id, {
            $set: {
                name:title,
                description,
                category,
                sleeveLength:sleeve,
                material,
                color,
                sizeVariations, 
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
  
    res.render('adminOrdersdetail',{order})
} catch (error) {
    console.log(error)
}
}

const changeOrderStatus= async(req,res)=>{
  const id= req.query.id
  const status=req.body.status
  
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

const renderaddOffer = async (req, res) => {
  try {
      const product = await Products.find()
      const categories = await Categories.find()
      res.render('addOffer', { product, categories })
  } catch (error) {
      res.status(500).json({ message: 'Error fetching products and categories' });
  }
}

const newOffer = async (req, res) => {
  try {
      const { 
          title, 
          description, 
          discountType, 
          discountValue, 
          startDate, 
          endDate, 
          active,
          applicableTo,
          productId,
          categoryId,
          maxUsage
      } = req.body;
      console.log(productId)
      console.log(categoryId)
     
      const newOffer = new Offers({
        title,
        description,
        discountType,
        discountValue: Number(discountValue),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        active: active === 'true',
        applicableTo,
        productId: applicableTo === 'product' || applicableTo === 'both' ? productId : [],
        categoryId: applicableTo === 'category' || applicableTo === 'both' ? categoryId : [],
        maxUsage: Number(maxUsage),
        usedCount: 0
    });
      await newOffer.save();
      res.status(200).json({ message: 'Offer created successfully' })
  } catch (error) {
      res.status(400).json({ message:'something went wrong! Try again.'});
  }
}



const renderOffersList = async(req,res)=>{
  try {
    const offers = await Offers.find();
    res.render('offerslist', { offers });
  } catch (error) {
    res.status(500).send('Error fetching offers');
  }

}

const unlistOffers = async(req,res)=>{
  const id = req.params.id
  try{
    const offer = await Offers.findByIdAndUpdate({_id:id},{$set:{active:false}})
    if(!offer){
      res.status(400).json({ message:'offer not found! Try again.'});
    }
    return res.redirect('/admin/offers')

  }catch(error){
    console.log(error)
    res.status(400).json({ message:'something went wrong! Try again.'});

  }
}

const listOffers = async(req,res)=>{
  const id = req.params.id
  try{
    const offer = await Offers.findByIdAndUpdate({_id:id},{$set:{active:true}})
    if(!offer){
      res.status(400).json({ message:'offer not found! Try again.'});
    }
    return res.redirect('/admin/offers')

  }catch(error){
    console.log(error)
    res.status(400).json({ message:'something went wrong! Try again.'});

  }
}

const deleteOffers = async(req,res)=>{
  const id = req.params.id
  try{
    const offer = await Offers.findByIdAndDelete({_id:id})
    if(!offer){
     return res.status(400).json({ message:'offer not found! Try again.'});
    }
    res.status(200).json({ message: 'Offer deleted successfully' })
  }catch(error){
    console.log(error)
    return res.status(400).json({ message:'something went wrong! Try again.'});

  }
}

const renderAddCoupon = async (req,res)=>{
  try {
    res.render('addCoupon') 
  } catch (error) {
    console.log(error);
    
  }
}
const createCoupon = async (req, res) => {
  const { code, name, description, isPercent, amount, expireDate, minPurchase, isActive } = req.body;
  try {
    if (!code || !name || !amount || !expireDate || minPurchase == null) {
      return res.status(400).json({ message: 'All required fields must be provided.' })
    }
    const exist = await Coupons.findOne({$or: [{ code: code }, { name: name }]})
    if (exist) {
      return res.status(400).json({success:false, message: 'Coupon with the same code or name already exists! Try another one.' })
    }

    const coupon = await Coupons.create({
      code,
      name,
      description,
      isPercent,
      amount,
      expireDate,
      minPurchase,
      isActive
    })
    if(coupon){
    return res.status(200).json({success:true, message: 'Coupon created successfully!'})
    }
  } catch (error) {
    console.error('Error creating coupon:', error)
    return res.status(500).json({
      success:false,
      message: 'Failed to create coupon. Please try again later.',
      error: error.message
    })
  }
}

const renderadminOrderitemdetails = async (req, res) => {
  const itemId = req.query.id
  const orderId = req.params.id

  try {
    const order = await Order.findById(orderId)
      .populate({
        path: 'items',
        match: { _id: itemId }, 
        populate: {
          path: 'productId',
          model: 'Product',
        },
      })
      .populate({
        path: 'user',
        ref: 'User', //
      });

    if (!order || !order.items.length) {
      return res.status(404).json({
        success: false,
        message: 'Order or item not found! Please try again.',
      });
    }

    const item = order.items[0]
    const orderStatus = item.orderStatus

    let statusOptions = []
    let showSaveButton = true;

    if (orderStatus === 'delivered') {
      showSaveButton = false
    } else if (orderStatus === 'returned') {
      statusOptions = ['refunded', 'rejected']
    } else {
      statusOptions = ['pending', 'confirmed', 'canceled', 'shipped', 'delivered']
      if (orderStatus === 'refunded' || orderStatus === 'rejected') {
        statusOptions = statusOptions.filter(status => status !== 'refunded' && status !== 'rejected');
      }
    }

    res.render('adminorderitemDetail', { order, statusOptions, showSaveButton });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while retrieving the order item.',
      error: error.message,
    });
  }
}
const changeReturnStatus = async (req, res) => {
  const orderId = req.params.id; 
  const status = req.body.status;
  const itemId = req.query.id;
  const userId =req.query.user

  try {
      const orderItemUpdate = await orderItem.findByIdAndUpdate(
          itemId,
          { $set: { orderStatus: status } },
          { new: true }
      );

      if (!orderItemUpdate) {
          return res.status(404).json({ message: "Order item not found." });
      }

      if (status === 'refunded') {
          const order = await Order.findById(orderId).populate('items');
          if (!order) {
              return res.status(404).json({ message: "Order not found." });
          }

          const totalOrderPrice = order.totalPrice;
          const totalDiscount = order.discount;
          console.log('total discount:',totalDiscount);
          
          const orderItem = order.items.find(item => item._id.toString() === itemId);
        
          if (!orderItem) {
              return res.status(404).json({ message: "Item not found in the order." });
          }
          let refundAmount = 0;
          if (totalDiscount !== 0) {
            const itemPrice = orderItem.price * orderItem.quantity;
            console.log("itemPrice",itemPrice);
            
            const proportionOfDiscount = (itemPrice / totalOrderPrice) * totalDiscount;
            console.log("proportionOfDiscount",proportionOfDiscount);
            
            refundAmount = Math.min(proportionOfDiscount, totalDiscount);
        } else {
            refundAmount = orderItem.price*orderItem.quantity
        }
        console.log('refundamount',refundAmount);
        
        
        if (order.paymentMethod === 'Razorpay' || order.paymentMethod === 'Wallet') {
          const wallet = await Wallet.findOne({ user: userId });
          
            if (wallet) {
                wallet.balance += refundAmount;
                try {
                    await wallet.save();
                } catch (error) {
                    console.error('Error saving wallet:', error);
                    return res.status(500).json({ message: "Error updating wallet balance." });
                }

                const transaction = new Transactions({
                    user: order.user,
                    amount: refundAmount,
                    type: 'credit',
                    description: `Refund for returned order item ${itemId}`,
                });
                  
                try {
                    await transaction.save();
                } catch (error) {
                    console.error('Error creating transaction:', error);
                    return res.status(500).json({ message: "Error creating transaction." });
                }

                wallet.transactions.push(transaction._id);
                await wallet.save();
            } else {
                console.error('Wallet not found for user:', userId);
                return res.status(404).json({ message: "Wallet not found." });
            }
        }

        order.totalPrice -= refundAmount;
        await order.save();

        const allItemsCanceled = order.items.every(item => item.orderStatus === 'returned');
        if (allItemsCanceled) {
            await Order.findByIdAndUpdate(
                orderId,
                { $set: { orderStatus: 'returned' } },
                { new: true }
            );
        }

        const allItemRefunded = order.items.every(item => item.orderStatus === 'refunded');
        if (allItemRefunded) {
            await Order.findByIdAndUpdate(
                orderId,
                { $set: { orderStatus: 'refunded' } },
                { new: true }
            );
        }
    }

    return res.redirect('/admin/order-list');
  } catch (error) {
      console.error("Error updating order item status:", error);
      return res.status(500).json({ message: "An error occurred while updating the order item status." });
  }
};


const renderSalesReport = async (req, res) => {
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

      let totalSales = 0
      let totalOrders = orders.length 
      let totalDiscount = 0;

      orders.forEach(order => {
          totalSales += order.totalPrice
          totalDiscount += order.discount || 0
      });

      const netSales = totalSales - totalDiscount;

      res.render('salesreport', { 
          orders, 
          totalSales, 
          totalOrders, 
          totalDiscount, 
          netSales 
      });
  } catch (error) {
      console.error("Error fetching sales report:", error);
      res.status(500).send("Internal Server Error");
  }
};



const filterReport = async (req, res) => {
  const { reportType, startDate, endDate } = req.body;
  let orders;

  try {
      const match = {};
      const today = new Date();

      if (reportType === 'daily') {
          const startOfDay = new Date(today.setHours(0, 0, 0, 0));
          const endOfDay = new Date(today.setHours(23, 59, 59, 999));
          match.createdAt = { $gte: startOfDay, $lte: endOfDay };
      } else if (reportType === 'weekly') {
          const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
          const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));
          match.createdAt = { $gte: startOfWeek, $lte: endOfWeek };
      } else if (reportType === 'monthly') {
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          match.createdAt = { $gte: startOfMonth, $lte: endOfMonth };
      } else if (reportType === 'custom' && startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999); 
          match.createdAt = { $gte: start, $lte: end };
      }

      orders = await Order.find(match)
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
          }).sort({ createdAt: -1 });

      res.json({ success: true, orders });
  } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

const downloadPdf = async (req, res) => {
  
  const { reportType, startDate, endDate } = req.body;
console.log("dsdsdsd,",endDate);

  try {
    const match = {};
    const today = new Date();

    switch (reportType) {
      case 'daily':
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));
        match.createdAt = { $gte: startOfDay, $lte: endOfDay };
        break;
      case 'weekly':
        const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
        const endOfWeek = new Date(new Date(startOfWeek).setDate(startOfWeek.getDate() + 6));
        match.createdAt = { $gte: startOfWeek, $lte: endOfWeek };
        break;
      case 'monthly':
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        match.createdAt = { $gte: startOfMonth, $lte: endOfMonth };
        break;
      case 'custom':
        if (startDate && endDate) {
          const customStartDate = new Date(startDate);
          const customEndDate = new Date(endDate);
          customEndDate.setHours(23, 59, 59, 999)
          match.createdAt = { $gte: customStartDate, $lte: customEndDate };
        } else {
          throw new Error('Start date and end date are required for custom report type');
        }
        break;
      default:
        throw new Error('Invalid report type');
    }

    const orders = await Order.find(match)
      .populate({
        path: 'items',
        populate: {
          path: 'productId',
          model: 'Product',
        },
      })
      .populate({
        path: 'user',
        model: 'User',
      });

    const pdf = new PDFDocument();
    const filename = `sales_report_${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-type', 'application/pdf');

    pdf.pipe(res);

    pdf.fontSize(18).text('Sales Report', { align: 'center' }).moveDown();

    pdf.fontSize(12).text(`Report Type: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`).moveDown(0.5);
    if (reportType === 'custom') {
      pdf.text(`Date Range: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`).moveDown();
    }

    const tableTop = 150;
    const rowHeight = 30;
    const columnWidths = [100, 120, 100, 80, 80, 80];
    const startX = 50;

    const drawRow = (rowY, isHeader = false) => {
      pdf
        .moveTo(startX, rowY)
        .lineTo(startX + columnWidths.reduce((a, b) => a + b), rowY)
        .stroke();

      if (isHeader) {
        pdf.font('Helvetica-Bold').fontSize(12);
      } else {
        pdf.font('Helvetica').fontSize(10);
      }
    };

    const drawBorders = (rowY) => {
      let x = startX;
      columnWidths.forEach((width) => {
        pdf.moveTo(x, rowY).lineTo(x, rowY + rowHeight).stroke();
        x += width;
      });
      pdf.moveTo(x, rowY).lineTo(x, rowY + rowHeight).stroke();
    };

    const addRowText = (data, rowY) => {
      let x = startX;
      data.forEach((text, i) => {
        pdf.text(text, x + 5, rowY + 10, { width: columnWidths[i] - 10, align: 'left' });
        x += columnWidths[i];
      });
    };

    drawRow(tableTop, true);
    addRowText(
      ['Date', 'Order ID', 'Customer', 'Total', 'Discount', 'Net Amount'],
      tableTop
    );
    drawBorders(tableTop);

    let y = tableTop + rowHeight;
    let totalSales = 0;
    let totalDiscount = 0;

    orders.forEach((order) => {
      drawRow(y);
      const netAmount = order.totalPrice - (order.discount || 0);
      addRowText(
        [
          new Date(order.createdAt).toLocaleDateString(),
          order.orderNo,
          order.user ? order.user.name : 'N/A',
          `₹${order.totalPrice.toFixed(2)}`,
          `₹${(order.discount || 0).toFixed(2)}`,
          `₹${netAmount.toFixed(2)}`,
        ],
        y
      );
      drawBorders(y);
      y += rowHeight;

      totalSales += order.totalPrice;
      totalDiscount += (order.discount || 0);
    });

    // Add summary
    y += 20;
    pdf.font('Helvetica-Bold').fontSize(12);
    pdf.text(`Total Sales: ₹${totalSales.toFixed(2)}`, startX, y);
    y += 20;
    pdf.text(`Total Discount: ₹${totalDiscount.toFixed(2)}`, startX, y);
    y += 20;
    pdf.text(`Net Sales: ₹${(totalSales - totalDiscount).toFixed(2)}`, startX, y);

    pdf.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};


const downloadExcel = async (req, res) => {
  const { reportType, startDate, endDate } = req.body;
  console.log(reportType);
  
  try {
      const match = {};
      const today = new Date();

      if (reportType === 'daily') {
          const startOfDay = new Date(today.setHours(0, 0, 0, 0));
          const endOfDay = new Date(today.setHours(23, 59, 59, 999));
          match.createdAt = { $gte: startOfDay, $lte: endOfDay };
      } else if (reportType === 'weekly') {
          const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
          const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));
          match.createdAt = { $gte: startOfWeek, $lte: endOfWeek };
      } else if (reportType === 'monthly') {
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          match.createdAt = { $gte: startOfMonth, $lte: endOfMonth };
      } else if (reportType === 'custom' && startDate && endDate) {
          match.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
      }

      const orders = await Order.find(match)
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

      console.log(orders);
      
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Sales Report');

      worksheet.columns = [
          { header: 'Date', key: 'date', width: 15 },
          { header: 'Order ID', key: 'orderId', width: 15 },
          { header: 'Customer', key: 'customer', width: 30 },
          { header: 'Total', key: 'total', width: 15 },
          { header: 'Discount', key: 'discount', width: 15 },
          { header: 'Net Amount', key: 'netAmount', width: 15 }
      ];

      orders.forEach(order => {
          const netAmount = order.totalPrice - (order.discount || 0);
          worksheet.addRow({
              date: new Date(order.createdAt).toLocaleDateString(),
              orderId: order.orderNo,
              customer: order.user ? order.user.name : 'N/A',
              total: order.totalPrice,
              discount: order.discount || 0,
              netAmount: netAmount
          });
      });

      res.setHeader('Content-Disposition', `attachment; filename=sales_report_${new Date().toISOString().split('T')[0]}.xlsx`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

      await workbook.xlsx.write(res);
      res.end();
  } catch (error) {
      console.error("Error generating Excel:", error);
      res.status(500).send("Internal Server Error");
  }
};

const adminSalesData = async(req,res)=>{
  const { filter, startDate, endDate } = req.query;
  let start, end;

  try {
      if (filter === 'yearly') {
          const year = new Date().getFullYear();
          start = new Date(`${year}-01-01`);
          end = new Date(`${year}-12-31`);
      } else if (filter === 'monthly') {
          const year = new Date().getFullYear();
          const month = new Date().getMonth() + 1;
          start = new Date(`${year}-${month}-01`);
          end = new Date(`${year}-${month + 1}-01`);
      } else if (filter === 'custom') {
          start = new Date(startDate);
          end = new Date(endDate);
      }

      const salesData = await Order.aggregate([
          {
              $match: {
                  createdAt: { $gte: start, $lte: end }
              }
          },
          {
              $group: {
                  _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                  totalSales: { $sum: "$totalPrice" }
              }
          },
          { $sort: { _id: 1 } }
      ]);
      
      res.status(200).json({ success: true, salesData });
  } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Internal server error" });
  }
}
const getBestSellingItems = async (req, res) => {
  try {
      const { type } = req.query;

      let groupByField, lookupCollection;

      if (type === 'products') {
          groupByField = '$items.productId';
          lookupCollection = 'products';
      } else if (type === 'categories') {
          groupByField = '$items.productId.category';
          lookupCollection = 'categories';
      } else {
          return res.status(400).json({ success: false, message: 'Invalid type parameter' });
      }

      const aggregationPipeline = [
          { $unwind: '$items' },
          {
              $lookup: {
                  from: 'orderitems',
                  localField: 'items',
                  foreignField: '_id',
                  as: 'orderItemDetails',
              },
          },
          { $unwind: '$orderItemDetails' },
          {
              $group: {
                  _id: groupByField,
                  totalQuantity: { $sum: '$orderItemDetails.quantity' },
              },
          },
          { $sort: { totalQuantity: -1 } },
          { $limit: 10 },
          {
              $lookup: {
                  from: lookupCollection,
                  localField: '_id',
                  foreignField: '_id',
                  as: `${type}Details`,
              },
          },
          { $unwind: `$${type}Details` },
          {
              $project: {
                  name: `$${type}Details.name`,
                  totalQuantity: 1,
              },
          },
      ];

      const bestSellingItems = await Order.aggregate(aggregationPipeline);

      return res.status(200).json({ success: true, data: bestSellingItems });
  } catch (error) {
      console.error('Error fetching best-selling items:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch best-selling items' });
  }
};
  


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
    changeOrderStatus,
    renderaddOffer,
    renderOffersList,
    newOffer,
    listOffers,
    unlistOffers,
    deleteOffers,
    renderAddCoupon,
    createCoupon,
    renderadminOrderitemdetails,
   changeReturnStatus,
   renderSalesReport,
   filterReport,
   downloadPdf,
   downloadExcel,
   adminSalesData,
   getBestSellingItems


    
}