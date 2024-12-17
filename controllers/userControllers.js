const products = require('../models/productModel')
const categories = require('../models/categoryModel');
const User = require('../models/userModel');
const Address = require('../models/addressModel')
const jwt = require('jsonwebtoken')
require('dotenv').config()
const bcrypt = require('bcryptjs')
const cartMiddleware = require ('../middleware/cartitems')
const { Cart, CartItem } = require('../models/cartModels');
const Order = require('../models/orderModels'); 
const OrderItem = require('../models/orderItemModel');
const WishList= require('../models/wishlistModel')
const Razorpay = require('razorpay');
const dotenv = require('dotenv');
dotenv.config();
const crypto = require('crypto');
const Coupons = require('../models/discountModel');
const Wallet = require('../models/walletModel');
const Transactions= require('../models/transactions')
const Offers=require('../models/offerModel')
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);



const razorpay = new Razorpay({
    key_id: process.env.RZP_KEY_ID,
    key_secret: process.env.RZP_KEY_SECRET,
});
const loadData = () => {
    try {
        const rawData = fs.readFileSync('data.json', 'utf-8'); // Added 'utf-8'
        return JSON.parse(rawData);
    } catch (error) {
        console.error("Error loading data.json:", error);
        return { faqs: [] }; // Re
    }
};

const Chatbot = async (req, res) => {
    try {
        const { message, chatHistory } = req.body;
        const data = loadData()
        
        console.log(message);
        
        const faqResponse = await data.faqs.find(faq => 
            message.toLowerCase().trim().includes(faq.question.toLowerCase().trim())
        );
      if(!faqResponse){
            console.log("not found");
            
        }
        if (faqResponse) {
            
            return res.status(200).json({ success: true, response: faqResponse.answer });
        }
        
        const history = chatHistory.map(item => ({
            role: item.role,
            content: item.content
        }));

        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        
        const chat = model.startChat({ parts: history });

        const result = await chat.sendMessage(message);
        const response = result.response.text()
        console.log(response)
        
        return res.status(200).json({ success: true, response });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: error.message });
    }
}

const renderHome = async (req, res) => {
    try {
        const newArrivals= await products.find().sort({createdAt:-1}).limit(6)
        const topProducts = await Order.aggregate([
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
                $group: {
                    _id: '$orderItems.productId', 
                    totalQuantity: { $sum: '$orderItems.quantity' }, 
                },
            },
            { $sort: { totalQuantity: -1 } }, 
            { $limit: 6 }, 
            {
                $lookup: {
                    from: 'products',
                    localField: '_id', 
                    foreignField: '_id', 
                    as: 'productDetails',
                },
            },
            { $unwind: '$productDetails' } 
        ]);

        const productIds = topProducts.map(p => p._id);
        const offers = await Offers.find({
            $or: [
                { applicableTo: 'product', productId: { $in: productIds } },
                { applicableTo: 'both', productId: { $in: productIds } },
            ],
            active: true,
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() }
        });

        const productsWithOffers = topProducts.map(product => {
            const productDetails = product.productDetails;
            const applicableOffers = offers.filter(offer => {
                return (offer.applicableTo === 'product' && offer.productId.includes(product._id)) ||
                    (offer.applicableTo === 'both' && (offer.productId.includes(product._id) || offer.categoryId.includes(productDetails.category)));
            });

            let bestPrice = productDetails.sizeVariations[0]?.price || 0; 
            let originalPrice = bestPrice;

            applicableOffers.forEach(offer => {
                let discountedPrice;
                if (offer.discountType === 'percentage') {
                    discountedPrice = bestPrice - (bestPrice * (offer.discountValue / 100));
                } else if (offer.discountType === 'fixed') {
                    discountedPrice = bestPrice - offer.discountValue;
                }

                if (discountedPrice < bestPrice) {
                    bestPrice = discountedPrice;
                }
            });

            return {
                ...productDetails,
                originalPrice,
                bestPrice,
                hasOffer: bestPrice < originalPrice
            };
        })
        const newArrivalsWithOffers = newArrivals.map(product => {
            const applicableOffers = offers.filter(offer => {
                return (offer.applicableTo === 'product' && offer.productId.includes(product._id)) ||
                    (offer.applicableTo === 'both' && (offer.productId.includes(product._id) || offer.categoryId.includes(product.category)));
            });

            let bestPrice = product.sizeVariations[0]?.price || 0; 
            let originalPrice = bestPrice;

            applicableOffers.forEach(offer => {
                let discountedPrice;
                if (offer.discountType === 'percentage') {
                    discountedPrice = bestPrice - (bestPrice * (offer.discountValue / 100));
                } else if (offer.discountType === 'fixed') {
                    discountedPrice = bestPrice - offer.discountValue;
                }

                if (discountedPrice < bestPrice) {
                    bestPrice = discountedPrice;
                }
            });

            return {
                ...product.toObject(),
                originalPrice,
                bestPrice,
                hasOffer: bestPrice < originalPrice
            };
        });
        res.render('landingPage', { topProducts: productsWithOffers,newArrivals: newArrivalsWithOffers });
    } catch (error) {
        console.error('Error in renderHome:', error);
        res.status(500).send('Something went wrong');
    }
};


const logout = async (req, res) => {

    res.clearCookie("refreshToken");
    res.clearCookie('accessToken')
    return res.redirect('/auth/login')
}



const renderShop = async (req, res) => {
    const sortOption = req.query.sort || 'default';
    console.log(sortOption);
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;
    const skip = (page - 1) * limit;

    const categoryId = req.query.category;
    const priceRange = req.query.price;
    const size = req.query.size;
    const color = req.query.color;
    const searchQuery = req.query.search;
    const userId = req.userId;
    
    let sortCriteria = {};
    switch (sortOption) {
        case 'priceLowToHigh':
            sortCriteria = { 'sizeVariations.price': 1 }; 
            break;
        case 'priceHighToLow':
            sortCriteria = { 'sizeVariations.price': -1 };
            break;
        case 'latest':
            sortCriteria = { 'createdAt': -1 }; 
            break;
        default:
            sortCriteria = {};
    }

    let filterCriteria = {};

    if (categoryId) {
        filterCriteria.category = categoryId;
    }

    if (size) {
        filterCriteria.size = size;
    }

    if (color) {
        filterCriteria.color = color;
    }

    if (priceRange) {
        const prices = priceRange.split('-');
        const minPrice = parseFloat(prices[0]);
        const maxPrice = parseFloat(prices[1]);
        filterCriteria.price = { $gte: minPrice, $lte: maxPrice };
    }

    let productResults;

    if (searchQuery) {
        productResults = await products.find({
            ...filterCriteria,
            name: { $regex: searchQuery, $options: 'i' }
        }).skip(skip).limit(limit).sort(sortCriteria); 
    } else {
        productResults = await products.find(filterCriteria).skip(skip).limit(limit).sort(sortCriteria); 
    }

    const offers = await Offers.find({
        $or: [
            { applicableTo: 'product', productId: { $in: productResults.map(p => p._id) } },
            { applicableTo: 'both', productId: { $in: productResults.map(p => p._id) } },
        ],
        active: true,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() }
    });

    const totalProducts = await products.countDocuments({
        ...filterCriteria,
        ...(searchQuery ? { name: { $regex: searchQuery, $options: 'i' } } : {})
    });
    const totalPages = Math.ceil(totalProducts / limit);

    const categorydata = await categories.find();
    const wishList = await WishList.findOne({ user: userId });

    const wishlist = wishList ? wishList.products : [];

    const productsWithOffers = productResults.map(product => {
        const applicableOffers = offers.filter(offer => {
            return (offer.applicableTo === 'product' && offer.productId.includes(product._id)) ||
                   (offer.applicableTo === 'both' && (offer.productId.includes(product._id) || offer.categoryId.includes(product.category)));
        });
    
        let bestPrice = product.sizeVariations[0].price; // Default to the original price
        let originalPrice = bestPrice;
    
        // Calculate the best price based on applicable offers
        applicableOffers.forEach(offer => {
            let discountedPrice;
            if (offer.discountType === 'percentage') {
                discountedPrice = bestPrice - (bestPrice * (offer.discountValue / 100));
            } else if (offer.discountType === 'fixed') {
                discountedPrice = bestPrice - offer.discountValue;
            }
    
            if (discountedPrice < bestPrice) {
                bestPrice = discountedPrice;
            }
        });
    
        return {
            ...product.toObject(),
            originalPrice,
            bestPrice,
            hasOffer: bestPrice < originalPrice 
        };
    });

 res.render('shop', {
        productData: productsWithOffers,
        categorydata,
        currentPage: page,
        totalPages,
        limit,
        sortOption,
        filterCriteria,
        searchQuery,
        wishlist
    });
}; 



const renderProductDetails = async (req, res) => {
    try {
        const id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).render('404', { message: 'Product not found' });
        }

        const product = await products.findById(id);
        if (!product) {
            return res.status(404).render('404', { message: 'Product not found' });
        }

        const offers = await Offers.find({
            productId: id,
            active: true,
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() }
        });

        const Related = await products.find({
            category: product.category,
            _id: { $ne: id }
        }).limit(10);
        console.log(Related);
        
        let lowestOfferPrice = product.sizeVariations && product.sizeVariations.length > 0 ? product.sizeVariations[0].price : null;

        if (lowestOfferPrice !== null) {
            offers.forEach(offer => {
                let discountedPrice;
                if (offer.discountType === 'percentage') {
                    discountedPrice = lowestOfferPrice - (lowestOfferPrice * (offer.discountValue / 100));
                } else if (offer.discountType === 'fixed') {
                    discountedPrice = lowestOfferPrice - offer.discountValue;
                }

                if (discountedPrice < lowestOfferPrice) {
                    lowestOfferPrice = discountedPrice;
                }
            });
        }

        res.render('product-details', {
            data: {
                ...product.toObject(),
                lowestOfferPrice,
                originalPrice: lowestOfferPrice !== null ? product.sizeVariations[0].price : null,
                Related 
            }
        });
    } catch (error) {
        console.error("Error in renderProductDetails:", error);
        res.status(500).send("An error occurred");
    }
}
const renderUserdashboard = async(req,res)=>{
    const id= req.userId
    try {
    const user = await User.findById(id)
    res.render('accountDashboard',{user})
    } catch (error) {
        console.log(error);
        
    }
}
const renderUserDetails = async (req, res) => {
    try {
        const token = req.cookies.refreshToken
        if (token) {
            const decode = jwt.verify(token, process.env.JWT_REFRESH_SECRET)
            const id = decode.userId
            const user = await User.findById(id)
            res.render('myAccount', { user })
        }
    } catch (error) {
        console.log(error.message);

    }
}

const softedit = async (req, res) => {
    try {
        const { name, phone } = req.body
        const id= req.userId  
            const exist = await User.findOne({ phone: phone });
            if (exist && exist._id.toString() !== id) {
                return res.status(500).json({ success: false, message: "User with same number exist" })
            } else {
                const userdata = await User.findByIdAndUpdate({ _id: id }, { phone: phone ,name:name})
                if (userdata) {
                    return res.status(200).json({ success: true, message: 'Details Updated successfully!' });
                }
            }

    } catch (error) {
        console.log(error)
        return res.status(500).json({ success: false, message: 'An error occurred while updating the details.' });
    }
}

const userPassword = async (req, res) => {
    try {
        console.log('hi')
        const { currentPassword, newPassword, cpassword } = req.body
        const token = req.cookies.refreshToken
        const decode = jwt.verify(token, process.env.JWT_REFRESH_SECRET)
        const id = decode.userId
        const user = await User.findById(id)
        const passwordMatch = await bcrypt.compare(currentPassword, user.password);
        if (!passwordMatch) {
            return res.status(500).json({ success: false, message: "Incorrect password" })
        } else {

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            const userdata = await User.findByIdAndUpdate({ _id: id }, { password: hashedPassword })
            console.log(userdata)
            if (userdata) {
                return res.status(200).json({ success: true, message: "Password changed successfully." })
            }
        }
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success: false, message: "An error occurred while updating the details." })
    }


}

const renderaddresses = async ( req,res)=>{
    try {
        const userId = req.userId
        const address =  await Address.find({userId:userId})
        res.render('address',{address})
    } catch (error) {
        console.log(error)
    }
   
}

const renderAddAddress = async(req,res) =>{
    res.render('add-address')
}

const newAddress = async (req,res) => {
    try {
        const {firstName,lastName,companyName,street,apartment,city,district,state,country,zip,phone}=req.body
    const userId= req.userId
    console.log('hi')
    console.log(req.body);
    
    const address = new Address({
        userId,
        firstName ,
        lastName,
        companyName,
        street,
        apartment,
        city,
        state,
        zip,
        phone,
        district,
        country,  
    })
    console.log(address);   
    if(address){
    await address.save()
    return res.status(200).json({ success: true, message: "addressed added successfully." })
    }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: "An error occurred while creating new address." })
    }
  
    
}

const deleteAddress = async (req,res)=>{
 const id= req.params.id
 try {
    await Address.deleteOne({_id:id})
    res.redirect('/user/account/address')
 } catch (error) {
    console.log(error);
 }
}

const renderEditAddress = async (req,res)=> {
    const id= req.params.id
    try {
        const address = await Address.findById(id)
        res.render('edit-address',{address})
    } catch (error) {
        console.log(error);
        
    }
}

const editAddress = async (req,res)=> {
    const id=req.params.id
    
    try {
        const {firstName,lastName,companyName,street,apartment,city,district,state,country,zip,phone}=req.body
        const address= await Address.findByIdAndUpdate({_id:id},{firstName ,
            lastName,
            companyName,
            street,
            apartment,
            city,
            state,
            zip,
            phone,
            district,
            country, })
            if(!address){
                return res.status(404).json({ success: false, message: "Address not found!!." }) 
            }
            return res.status(200).json({ success: true, message: "Updated the address successfully." }) 
           } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: "something went wrong !! Please try again later" })
    }
}
const addItemToCart = async (req, res) => {
    const userId = req.userId;
    const productId = req.params.id;
    const quantity = req.body.quantity || 1;
    const selectedSize = req.body.selectedSize;
    
    if (!selectedSize) {
        return res.status(400).json({ message: 'Please select a size' });
    }

    try {
        const product = await products.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        
        const sizeVariation = product.sizeVariations.find(size => size.size === selectedSize);
        if (!sizeVariation) {
            return res.status(400).json({ message: 'Selected size not available' });
        }
        
        if (quantity > 5) {
            return res.status(400).json({ message: 'You can only add up to 5 products at a time' });
        }
        
        if (quantity > sizeVariation.stock) {
            return res.status(400).json({ message: `Only ${sizeVariation.stock} items available in size ${selectedSize}` });
        }

        const offers = await Offers.find({
            $or: [
                { applicableTo: 'product', productId: productId },
                { applicableTo: 'both', productId: productId }
            ],
            active: true,
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() }
        });
        let bestPrice = sizeVariation.price;
        offers.forEach(offer => {
            let discountedPrice;
            if (offer.discountType === 'percentage') {
                discountedPrice = bestPrice - (bestPrice * (offer.discountValue / 100));
            } else if (offer.discountType === 'fixed') {
                discountedPrice = bestPrice - offer.discountValue;
            }
            if (discountedPrice < bestPrice) {
                bestPrice = discountedPrice;
            }
        });
        
        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            cart = new Cart({ user: userId });
            await cart.save();
        }
        
        let cartItem = await CartItem.findOne({ product: productId, size: selectedSize,user:userId });
       
        let offer = sizeVariation.price - bestPrice;

        if (cartItem) {
            if(cartItem.quantity==5) {
                res.status(403).json({ message: 'Item added too many times', cart });
            }
            cartItem.quantity += quantity;
            cartItem.price = bestPrice;
            await cartItem.save();
        } else {
            cartItem = new CartItem({
                product: productId,
                user:userId,
                quantity,
                price: bestPrice,
                size: selectedSize,
                cart: cart._id,
                offer,
            });
            try {
                await cartItem.save();
                await cart.cartItems.push(cartItem._id); 
                cart.totalQuantity += quantity;
                cart.totalPrice += bestPrice * quantity;
                await cart.save();
            } catch (error) {
                console.log(error);
                
            }
        }

        // Update cart totals

        // Handle wishlist updates
        const wishlistUpdate = await WishList.findOne({ user: userId });
        if (wishlistUpdate) {
            const productIdsAsString = wishlistUpdate.products.map(id => id.toString());
            if (productIdsAsString.includes(productId)) {
                wishlistUpdate.products = wishlistUpdate.products.filter(id => id.toString() !== productId);
                await wishlistUpdate.save();
            } 
        }

        await cartMiddleware(cart);

        res.status(200).json({ message: 'Item added to cart successfully', cart });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error adding item to cart' });
    }
};;

const renderCart = async (req, res) => {
    try {
        const userId = req.userId; 
        const cart = await Cart.findOne({ user: userId }).populate({
            path: 'cartItems',
            populate: {
                path: 'product',
                model: 'Product' 
            }
        })
        if (!cart) {
            return res.render('cart', { cart: null }); 
        }

        let totalQuantity = 0;
        let totalPrice = 0;

        const productIds = cart.cartItems.map(item => item.product._id);
        const offers = await Offers.find({
            $or: [
                { applicableTo: 'product', productId: { $in: productIds } },
                { applicableTo: 'both', productId: { $in: productIds } }
            ],
            active: true,
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() }
        });
        cart.cartItems.forEach(item => {
            totalQuantity += item.quantity;

            let bestPrice = item.price; 
            let originalPrice = item.product.price

            if (bestPrice < originalPrice) {
                totalPrice += bestPrice * item.quantity;
                return; 
            }

            const applicableOffers = offers.filter(offer => {
                return (offer.applicableTo === 'product' && offer.productId.includes(item.product._id)) ||
                       (offer.applicableTo === 'both' && (offer.productId.includes(item.product._id) || offer.categoryId.includes(item.product.category)));
            });

            applicableOffers.forEach(offer => {
                let discountedPrice;
                if (offer.discountType === 'percentage') {
                    discountedPrice = originalPrice - (originalPrice * (offer.discountValue / 100));
                } else if (offer.discountType === 'fixed') {
                    discountedPrice = originalPrice - offer.discountValue;
                }

                if (discountedPrice < bestPrice) {
                    bestPrice = discountedPrice;
                }
            });

            item.price = bestPrice;
            totalPrice += bestPrice * item.quantity
        });

        cart.totalQuantity = totalQuantity;
        cart.totalPrice = totalPrice;
        await cart.save();                
        res.render('cart', { cart });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching cart');
    }
};

const UpdateCartQuantity = async(req,res)=>{
    const { productId, quantity } = req.body;
    const userId = req.userId 

    try {
        const cart = await Cart.findOne({ user: userId })
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }
        const cartItem = await CartItem.findOne({ cart: cart._id, product: productId });
        if (cartItem) {
            cartItem.quantity = quantity
            await cartItem.save()
            const cartItems = await CartItem.find({ cart: cart._id });
            cart.totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
            cart.totalPrice = cartItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
            await cart.save()

            res.status(200).json({ message: 'Quantity updated successfully' })
        } else {
            res.status(404).json({ message: 'Cart item not found' })
        }
    } catch (err) {
        console.error('Error updating cart:', err)
        res.status(500).json({ message: 'Server error' })
    }
}

const removeCartItem = async (req, res) => {
    try {
        const userId = req.userId
        const itemId = req.params.id
        const cart = await Cart.findOne({ user: userId })
        if (!cart) {
            return res.status(404).send('Cart not found')
        }
        const item = await CartItem.findById(itemId)
        if (!item) {
            return res.status(404).send('Item not found')
        }
        const index = cart.cartItems.findIndex(cartItem => cartItem._id.toString() === itemId)
        if (index === -1) {
            return res.status(404).send('Item not in cart');
        }
        cart.totalQuantity -= item.quantity;
        cart.totalPrice -= item.price * item.quantity 
        cart.cartItems.splice(index, 1)
        await cart.save()
        await CartItem.findByIdAndDelete(itemId)
        return res.redirect('/user/cart')
    } catch (error) {
        console.error(error)
        return res.status(500).send('Server error')
    }
}

const updateCartQuantity = async (req, res) => {
    const userId = req.userId;
    const { itemId, quantity } = req.body;

    try {
        const item = await CartItem.findById(itemId).populate('product');

        if (!item) {
            return res.status(404).json({ 
                success: false, 
                message: 'Item not found' 
            });
        }

        if (quantity > 5) {
            return res.json({ 
                success: false, 
                message: 'Quantity cannot exceed 5 for each item',
            });
        }

        // Fetch applicable offers for the product
        const offers = await Offers.find({
            $or: [
                { applicableTo: 'product', productId: item.product._id },
                { applicableTo: 'both', productId: item.product._id }
            ],
            active: true,
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() }
        });
        let bestPrice = item.product.sizeVariations[0].price
        console.log(bestPrice)
        offers.forEach(offer => {
            let discountedPrice;
            if (offer.discountType === 'percentage') {
                discountedPrice = bestPrice - (bestPrice * (offer.discountValue / 100));
            } else if (offer.discountType === 'fixed') {
                discountedPrice = bestPrice - offer.discountValue;
            }

            if (discountedPrice < bestPrice) {
                bestPrice = discountedPrice;
            }
        });
        item.quantity = quantity;
        item.price = bestPrice; 
        await item.save();

        const updatedPrice = bestPrice * item.quantity;
        

        const cart = await Cart.findOne({ user: userId }).populate('cartItems');
        if (!cart) {
            return res.status(404).json({ 
                success: false, 
                message: 'Cart not found' 
            });
        }

        let totalQuantity = 0;
        let totalPrice = 0;

        cart.cartItems.forEach(cartItem => {
            totalQuantity += cartItem.quantity;
            totalPrice += cartItem.price * cartItem.quantity;
        });

        cart.totalQuantity = totalQuantity;
        cart.totalPrice = totalPrice;
        await cart.save();

        res.json({ 
            success: true, 
            updatedPrice: updatedPrice, 
            cartTotal: totalPrice
        });
    } catch (error) {
        console.log('Error updating cart:', error);
        res.status(500).json({ 
            success: false, 
            message: 'An error occurred while updating the cart'
        });
    }
};


const rendercheckOut = async(req,res)=>{
    try {
        const userId = req.userId; 
        const cart = await Cart.findOne({ user: userId }).populate({
            path: 'cartItems',
            populate: {
                path: 'product',
                model: 'Product' 
            }
        });
        
        if(cart.cartItems.length==0){
            return res.redirect('/user/shop')
        }
    
        const coupon= await Coupons.find({isActive:true})        
        const address =  await Address.find({userId:userId})

        res.render('checkout',{cart,address,coupon})
    } catch (error) {
        console.log(error)
    }
}

const proceedtoCheckout = async (req, res) => {
    const userId = req.userId;
    try {
        const cart = await Cart.findOne({ user: userId }).populate({
            path: 'cartItems',
            populate: {
                path: 'product',
                model: 'Product'
            }
        })
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }
        const outOfStockItems = [];
        for (const item of cart.cartItems) {
            const product = item.product;

            const selectedSizeVariation = product.sizeVariations.find(sizeVariation => sizeVariation.size === item.size);

            if (selectedSizeVariation) {
                if (item.quantity > selectedSizeVariation.stock) {
                    outOfStockItems.push({
                        name: product.name,
                        requested: item.quantity,
                        available: selectedSizeVariation.stock,
                        size: item.size 
                    });
                }
            } else {
                outOfStockItems.push({
                    name: product.name,
                    requested: item.quantity,
                    available: 0,
                    size: item.size,
                    message: 'Selected size is not available'
                });
            }
        }

        if (outOfStockItems.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Some items exceed available stock',
                outOfStockItems
            });
        } else {
            return res.json({ success: true, message: 'Checkout successful' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
const renderOrderSuccess = async (req,res)=>{
    try {
        const id=req.params.id
        
        const order= await Order.findById(id)
        
        if(!order){
            return res.status(404).send('order not found');
        }
        res.render('ordersucces',{order})
    } catch (error) {
        console.log(error);
        
    }
}


const createOrder = async (req, res) => {
    const userId = req.userId;
    const { addressId, paymentMethod } = req.body;
    console.log(paymentMethod);
    

    try {
        const cart = await Cart.findOne({ user: userId }).populate({
            path: 'cartItems',
            populate: { path: 'product', select: 'name price stock sizeVariations' }
        })        
        
        if (!cart || cart.cartItems.length === 0) {
            return res.status(400).json({ message: "Your cart is empty." });
        }
        
        const orderNo = await Order.getNextOrderNumber();
        const address = await Address.findById(addressId);
        const totalPriceInPaise = Math.round(cart.totalPrice * 100)
        
        if(cart.totalPrice>1000 && paymentMethod == 'Pay On Delivery'){
            return res.status(403).json({ message: "Cash on delivery is not abailable for orders above 1000." });
        }
        
        if (paymentMethod === 'Razorpay') {
            const razorpayOrder = await razorpay.orders.create({
                amount: totalPriceInPaise, 
                currency: 'INR',
                receipt: orderNo.toString(),
                payment_capture: 1, 
            });
            
            return res.status(200).json({
                success: true,
                message: "Razorpay order created successfully",
                key:process.env.RZP_KEY_ID,
                razorpayOrderId: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
            });
        } else if(paymentMethod=='Wallet'){
            
            const wallet= await Wallet.findOne({user:userId})
            if(!wallet){
                console.log("wallet not found");
                return res.status(400).json({message:'Wallet Not found for this user'})
                
            }
            if(wallet.balance<cart.totalPrice){
                
                return res.status(403,{message:"your wallet does not have sufficent fund! Please try another method"})
            }
            const newOrder = new Order({
                user: userId,
                address,
                items: [],
                totalQuantity: cart.totalQuantity,
                totalPrice: cart.totalPrice,
                paymentMethod,
                orderNo,
                orderStatus: 'confirmed',
                discount:cart.discount,
                offer:cart.offer
            });
            
            
            
            for (const cartItem of cart.cartItems) {
                const { product, quantity, size,price } = cartItem;
                
                const productDoc = await products.findById(product._id);
                if (!productDoc) {
                    return res.status(404).json({ message: "Product not found." });
                }
                
                const sizeVariation = productDoc.sizeVariations.find(s => s.size === size);
                if (!sizeVariation || sizeVariation.stock < quantity) {
                    return res.status(400).json({
                        message: `Insufficient stock for ${productDoc.name} (Size: ${size}).`
                    });
                }
                
                const orderItem = new OrderItem({
                    productId: productDoc._id,
                    productName: productDoc.name,
                    quantity,
                    size: sizeVariation.size,
                    price,
                    OrderStatus: 'confirmed',
                });
                
                await orderItem.save();
                newOrder.items.push(orderItem);
                
                sizeVariation.stock -= quantity;
                await productDoc.save();
            }
            
            await newOrder.save();
            await CartItem.deleteMany({ _id: { $in: cart.cartItems.map(item => item._id) } });
            cart.cartItems = [];
            cart.totalQuantity = 0;
            cart.totalPrice = 0;
            cart.appliedCoupon=null
            cart.discount=0
            await cart.save()
            
            const transaction = new Transactions({
                user: userId,
                amount: newOrder.totalPrice,
                type: 'debit',
                description: `Transaction for Order #${newOrder.orderNo}: Funds allocated for the purchase of goods and services.`,
            });            
            try {
                await transaction.save();
                console.log('Transaction created:', transaction);
            } catch (error) {
                console.error('Error creating transaction:', error);
                return res.status(500).json({ message: "Error creating transaction." });
            }
            wallet.balance-=newOrder.totalPrice
            wallet.transactions.push(transaction._id);
            await wallet.save(); 
            return res.status(200).json({
                success: true,
                message: "Order placed successfully",
                orderId: newOrder._id 
            })    
            
        }else {
            const newOrder = new Order({
                user: userId,
                address,
                items: [],
                totalQuantity: cart.totalQuantity,
                totalPrice: cart.totalPrice,
                paymentMethod,
                orderNo,
                orderStatus: 'confirmed',
                discount:cart.discount,
                offer:cart.offer
            });
           
            
        
            for (const cartItem of cart.cartItems) {
                const { product, quantity, size,price } = cartItem;
                
                const productDoc = await products.findById(product._id);
                if (!productDoc) {
                    return res.status(404).json({ message: "Product not found." });
                }

                const sizeVariation = productDoc.sizeVariations.find(s => s.size === size);
                if (!sizeVariation || sizeVariation.stock < quantity) {
                    return res.status(400).json({
                        message: `Insufficient stock for ${productDoc.name} (Size: ${size}).`
                    });
                }

                const orderItem = new OrderItem({
                    productId: productDoc._id,
                    productName: productDoc.name,
                    quantity,
                    size: sizeVariation.size,
                    price,
                    OrderStatus: 'confirmed',
                });

                await orderItem.save();
                newOrder.items.push(orderItem);

                sizeVariation.stock -= quantity;
                await productDoc.save();
            }

            await newOrder.save();
            await CartItem.deleteMany({ _id: { $in: cart.cartItems.map(item => item._id) } });
            cart.cartItems = [];
            cart.totalQuantity = 0;
            cart.totalPrice = 0;
            cart.appliedCoupon=null
            cart.discount=0
            await cart.save();
            return res.status(200).json({
                success: true,
                message: "Order placed successfully",
                orderId: newOrder._id 
            })        }
    } catch (error) {
        console.error("Error placing order:", error);
        return res.status(500).json({ success: false, message: "Error placing order", error: error.message });
    }
};

const verifyPaymentAndCreateOrder = async (req, res) => {
    const { order_id, payment_id, signature, addressId } = req.body;
    const userId = req.userId;
    const generatedSignature = crypto.createHmac('sha256', process.env.RZP_KEY_SECRET)
        .update(order_id + '|' + payment_id)
        .digest('hex');  
        
    // Fetch the cart for the user
    const cart = await Cart.findOne({ user: userId }).populate({
        path: 'cartItems',
        populate: { path: 'product', select: 'name price stock sizeVariations' }
    });

    if (!cart || cart.cartItems.length === 0) {
        return res.status(400).json({ message: "Your cart is empty." });
    }
    
    const totalPriceInPaise = Math.round(cart.totalPrice * 100);
    const orderNo = await Order.getNextOrderNumber();
    const address = await Address.findById(addressId);

    // Create the order with status 'pending'
    const newOrder = new Order({
        user: userId,
        address,
        items: [],
        totalQuantity: cart.totalQuantity,
        totalPrice: cart.totalPrice,
        paymentMethod: 'Razorpay',
        orderNo,
        orderStatus: 'pending', // Set order status to pending initially
        discount: cart.discount
    });

    for (const cartItem of cart.cartItems) {
        const { product, quantity, size, price } = cartItem;
        const productDoc = await products.findById(product._id);
        if (!productDoc) {
            return res.status(404).json({ message: "Product not found." });
        }

        const sizeVariation = productDoc.sizeVariations.find(s => s.size === size);
        if (!sizeVariation || sizeVariation.stock < quantity) {
            return res.status(400).json({
                message: `Insufficient stock for ${productDoc.name} (Size: ${size}).`
            });
        }

        const orderItem = new OrderItem({
            productId: productDoc._id,
            productName: productDoc.name,
            quantity,
            size: sizeVariation.size,
            price,
            orderStatus: 'pending', // Set item status to pending as well
        });

        await orderItem.save();
        newOrder.items.push(orderItem);

        sizeVariation.stock -= quantity;
        await productDoc.save();
    }

    await newOrder.save(); // Save the order first

    // Now verify the payment
    if (generatedSignature === signature) {
        // Payment is successful, update the order status and order items
        newOrder.orderStatus = 'confirmed';
        await newOrder.save(); // Save the updated order status

        for (const item of newOrder.items) {
            item.orderStatus = 'confirmed';
            await item.save(); // Save each updated order item
        }

        await CartItem.deleteMany({ _id: { $in: cart.cartItems.map(item => item._id) } });
        cart.cartItems = [];
        cart.totalQuantity = 0;
        cart.totalPrice = 0;
        cart.appliedCoupon=null
        cart.discount=0
        await cart.save();

        return res.status(200).json({ success: true, message: "Order placed successfully", orderId: newOrder._id });
    } else {
        // Payment verification failed, but the order is already created with status pending
        return res.status(200).json({ success: true, message: "Order placed, but payment verification failed", orderId: newOrder._id });
    }
};
const retryPayment = async (req, res) => {
    const { orderId, payment_id, signature, addressId } = req.body;
    const userId = req.userId;

    try {
        const generatedSignature = crypto.createHmac('sha256', process.env.RZP_KEY_SECRET)
            .update(orderId + '|' + payment_id)
            .digest('hex');

        // if (generatedSignature !== signature) {
        //     return res.status(400).json({ success: false, message: 'Invalid payment signature.' });
        // }
        console.log("Signature verified");
        
        const order = await Order.findById(orderId).populate('items');
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }
        console.log('Order found');
        
        if (addressId) {
            const address = await Address.findOne({ _id: addressId});
            if (!address) {
                return res.status(404).json({ success: false, message: 'Address not found.' });
            }
            order.address = address;
        }

        for (const item of order.items) {
            const productDoc = await products.findOne({ _id: item.productId });
            if (!productDoc) {
                return res.status(404).json({ success: false, message: `Product not found for ID: ${item.productId}` });
            }

            const sizeVariation = productDoc.sizeVariations.find(s => s.size === item.size);
            if (!sizeVariation || sizeVariation.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${item.productName} (Size: ${item.size}).`,
                });
            }

            sizeVariation.stock -= item.quantity;
            await productDoc.save();

            item.orderStatus = 'confirmed';
            await item.save()
        }

        order.orderStatus = 'confirmed';
        order.updatedAt = Date.now();
        await order.save();

        return res.status(200).json({ success: true, message: 'Order placed successfully', orderId: order._id });
    } catch (error) {
        console.error(`Error in retryPayment for orderId ${orderId}:`, error);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

const createPendingOrder = async (req, res) => {
    const { addressId, order_id } = req.body;
    const userId = req.userId;

    try {
        const cart = await Cart.findOne({ user: userId }).populate({
            path: 'cartItems',
            populate: { path: 'product', select: 'name price stock sizeVariations' }
        });

        if (!cart || cart.cartItems.length === 0) {
            return res.status(400).json({ success: false, message: "Your cart is empty." });
        }

        const address = await Address.findById(addressId);
        if (!address) {
            return res.status(404).json({ success: false, message: "Address not found." });
        }

        const orderNo = await Order.getNextOrderNumber();

        const newOrder = new Order({
            user: userId,
            address,
            items: [],
            totalQuantity: cart.totalQuantity,
            totalPrice: cart.totalPrice,
            paymentMethod: 'Razorpay',
            orderNo,
            orderStatus: 'pending',
            discount: cart.discount,
            razorpayOrderId: order_id
        });

        for (const cartItem of cart.cartItems) {
            const { product, quantity, size, price } = cartItem;
            const productDoc = await products.findById(product._id);

            if (!productDoc) {
                return res.status(404).json({ success: false, message: `Product not found: ${product.name}` });
            }

            const sizeVariation = productDoc.sizeVariations.find(s => s.size === size);
            if (!sizeVariation || sizeVariation.stock < quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${productDoc.name} (Size: ${size}).`
                });
            }

            const orderItem = new OrderItem({
                productId: productDoc._id,
                productName: productDoc.name,
                quantity,
                size: sizeVariation.size,
                price,
                orderStatus: 'pending',
            });

            await orderItem.save();
            newOrder.items.push(orderItem);
        }

        await newOrder.save();

        // Clear the cart after creating the order
        await Cart.findOneAndUpdate({ user: userId }, { $set: { cartItems: [], totalQuantity: 0, totalPrice: 0, discount: 0 } });

        return res.status(200).json({
            success: true,
            message: "Order created with status pending.",
            orderId: newOrder._id
        });
    } catch (error) {
        console.error('Error in createPendingOrder:', error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};


const renderOrders = async (req,res)=>{
    try {
        const id=req.userId        
        const orders = await Order.find({ user: id }).populate({
            path: 'items',
            populate: {
                path: 'productId',
                model: 'Product' 
            }
        }).sort({createdAt:-1});
        const key=process.env.RZP_KEY_ID
        res.render('orders',{orders,key})
    } catch (error) {
        console.log(error)
    }
}
 const rendercancelitem = async(req,res)=>{
    const itemId=req.query.id
    const orderId=req.query.orderId    
    const id=req.userId
    try {
        const order = await Order.find({ user: id, _id: orderId })
  .populate({
    path: 'items',
    match: { _id: itemId }, 
    populate: {
      path: 'productId',
      model: 'Product'
    }
  });

    if(!order){
        return res.status(500).json({ success: false, message: "Something went worng!! Please try again", error: error.message })
    }
    res.render('orderItemCancel',{order})
    } catch (error) {
        console.log(error)
    }
 }

 const renderOrderdetails = async(req,res)=>{
    const orderId=req.query.id       
    const id=req.userId
    try {
  const order = await Order.find({ user:id, _id: orderId })
  .populate({
    path: 'items',
    populate: {
      path: 'productId',
      model: 'Product'
    }
  })

  
    if(!order){
        return res.status(500).json({ success: false, message: "Something went worng!! Please try again", error: error.message })
    }
    res.render('userOrderdetails',{order})
    } catch (error) {
        console.log(error)
    }
 } 
 const cancelOrderitem = async (req, res) => {
    const itemId = req.query.id;
    const orderId = req.query.orderId;
    const reason = req.body.reason;
    try {
        if (!reason) {
            return res.status(400).json({ message: "Cancellation reason is required." });
        }
        
        const orderItem = await OrderItem.findById(itemId);
        if (!orderItem) {
            return res.status(404).json({ message: "Order item not found." });
        }

        const order = await Order.findById(orderId).populate('items');
        if (!order) {
            return res.status(404).json({ message: "Order not found." });
        }

        const totalOrderPrice = order.totalPrice; 
        const totalDiscount = order.discount
        const itemPrice = orderItem.price * orderItem.quantity
        await OrderItem.findByIdAndUpdate(
            { _id: itemId },
            { $set: { orderStatus: 'canceled', reason: reason } },
            { new: true }
        )

        const productDoc = await products.findById(orderItem.productId);
        if (productDoc) {
            const sizeVariation = productDoc.sizeVariations.find(s => s.size === orderItem.size);
            if (sizeVariation) {
                sizeVariation.stock += orderItem.quantity;
                await productDoc.save();
            }
        }

        const proportionOfDiscount = (itemPrice / totalOrderPrice) * totalDiscount;
        const refundAmount = Math.min(proportionOfDiscount, totalDiscount)
        if (order.paymentMethod === 'Razorpay') {
                const wallet = await Wallet.findOne({ user: order.user });
                if (wallet) {
                    wallet.balance += refundAmount;
                    await wallet.save();
    
                    const transaction = new Transactions({
                        user: order.user,
                        amount: refundAmount,
                        type: 'credit',
                        description: `Refund for canceled orderitem ${itemId}`,
                    });
                    await transaction.save();
    
                    wallet.transactions.push(transaction._id);
                    await wallet.save();
                
            }
        }

        order.totalPrice -= refundAmount; 
        // order.discount -= refundAmount; 
        await order.save();

        const allItemsCanceled = order.items.every(item => item.orderStatus === 'canceled');
        if (allItemsCanceled) {
            await Order.findByIdAndUpdate(
                orderId,
                { $set: { orderStatus: 'canceled' } },
                { new: true }
            );
        }
        return res.redirect(`/user/account/view-order?id=${orderId}`);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "An error occurred while canceling the order item." });
    }
};
const renderCancelConfirm = async (req,res)=>{
    const orderId=req.query.id       
    const id=req.userId
    try {
  const order = await Order.find({ user:id, _id: orderId })
  .populate({
    path: 'items',
    populate: {
      path: 'productId',
      model: 'Product'
    }
  })

  
    if(!order){
        return res.status(500).json({ success: false, message: "Something went worng!! Please try again", error: error.message })
    }
    res.render('userCancelOrder',{order})
    } catch (error) {
        console.log(error)
    }
}


const cancelOrder = async (req, res) => {
    const orderId = req.query.id;
    const reason = req.body.reason;
    try {
        if (!reason) {
            return res.status(400).json({ message: "Cancellation reason is required." });
        }

        const order = await Order.findById(orderId).populate('items');
        if (!order) {
            return res.status(404).json({ message: "Order not found." });
        }

        const isRazorpay = order.paymentMethod === 'Razorpay';
        const orderAmount = order.totalPrice

        const cancel = await Order.findByIdAndUpdate(
            { _id: orderId },
            { $set: { orderStatus: 'canceled', reason: reason } },
            { new: true }
        );

        const itemUpdatePromises = order.items.map(async (item) => {
            if (item.orderStatus === 'canceled') {
                return;
            }
            await OrderItem.findByIdAndUpdate(
                item._id,
                { $set: { orderStatus: 'canceled' } },
                { new: true }
            );
            const productDoc = await products.findById(item.productId);
            if (productDoc) {
                const sizeVariation = productDoc.sizeVariations.find(s => s.size === item.size);
                if (sizeVariation) {
                    sizeVariation.stock += item.quantity;
                    await productDoc.save();
                }
            }
        });
        await Promise.all(itemUpdatePromises);

        if (isRazorpay) {
            const wallet = await Wallet.findOne({ user: order.user });
            if (wallet) {
                wallet.balance += orderAmount;
                await wallet.save();

                const transaction = new Transactions({
                    user: order.user,
                    amount: orderAmount,
                    type: 'credit',
                    description: `Refund for canceled order ${orderId}`,
                });
                await transaction.save();

                wallet.transactions.push(transaction._id);
                await wallet.save();
            }
        }

        return res.redirect(`/user/account/orders`);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "An error occurred while canceling the order." });
    }
};

const addtoWishlist = async(req,res)=>{
    const {productId}=req.body
    const userId= req.userId
    
    try {
        let wishList= await WishList.findOne({user:userId})
        if(!wishList){
            wishList= new WishList({
                user:userId,
                products:[]
            })
        }
        if(!wishList.products.includes(productId)){
            wishList.products.push(productId)
            await wishList.save()
            return res.json({ message: 'Product added to wishlist!' });
        }else{
            return res.json({ message: 'Product is already in your wishlist.' });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Error adding to wishlist.' });
    }
}

const removeFromWishlist = async (req, res) => {
    const { productId } = req.body;
    const userId = req.userId;

    try {
        const wishlist = await WishList.findOne({ user: userId });
        console.log(productId);

        if (wishlist) {
            const productIdsAsString = wishlist.products.map(id => id.toString());
            if (productIdsAsString.includes(productId)) {
                wishlist.products = wishlist.products.filter(id => id.toString() !== productId);
                await wishlist.save();
                return res.json({ message: 'Product removed from wishlist!' });
            } else {
                return res.json({ message: 'Product is not in your wishlist.' });
            }
        } else {
            return res.json({ message: 'Wishlist not found.' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error removing from wishlist.' });
    }
}
const renderWishlist = async (req, res) => {
    const userId = req.userId;
    try {
        const wishlist = await WishList.findOne({ user: userId })
            .populate({
                path: 'products',
                model: 'Product'
            });

        if (!wishlist) {
            return res.render("wishlist", { wishlist: null });
        }

        // Fetch applicable offers for the products in the wishlist
        const offers = await Offers.find({
            $or: [
                { applicableTo: 'product', productId: { $in: wishlist.products.map(p => p._id) } },
                { applicableTo: 'both', productId: { $in: wishlist.products.map(p => p._id) } },
            ],
            active: true,
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() }
        });

        const productsWithOffers = wishlist.products.map(product => {
            const applicableOffers = offers.filter(offer => {
                return (offer.applicableTo === 'product' && offer.productId.includes(product._id)) ||
                       (offer.applicableTo === 'both' && (offer.productId.includes(product._id) || offer.categoryId.includes(product.category)));
            });

            let bestPrice = product.sizeVariations[0].price
            let originalPrice = bestPrice;

            applicableOffers.forEach(offer => {
                let discountedPrice;
                if (offer.discountType === 'percentage') {
                    discountedPrice = bestPrice - (bestPrice * (offer.discountValue / 100));
                } else if (offer.discountType === 'fixed') {
                    discountedPrice = bestPrice - offer.discountValue;
                }

                if (discountedPrice < bestPrice) {
                    bestPrice = discountedPrice;
                }
            });

            return {
                ...product.toObject(),
                originalPrice,
                bestPrice,
                hasOffer: bestPrice < originalPrice 
            };
        });

        res.render("wishlist", { wishlist: productsWithOffers });
    } catch (error) {
        console.log(error);
        res.status(500).send("Internal Server Error");
    }
};

const showCoupons = async(req,res)=>{
    try {
        const coupons = await Coupons.find({ isActive: true }); 
        res.json(coupons);
    } catch (error) {
        console.error('Error fetching coupons:', error);
        res.status(500).json({ message: 'Failed to fetch coupons.' });
    }
}

const applyCoupon = async (req, res) => {
    const { couponCode } = req.body;
    const userId = req.userId;

    try {
        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found.' });
        }

        if (cart.appliedCoupon) {
            return res.status(400).json({ message: 'A coupon is already applied. Please remove it before adding a new one.' });
        }

        const coupon = await Coupons.findOne({ code: couponCode, isActive: true });
        if (!coupon) {
            return res.status(400).json({ message: 'Invalid or inactive coupon code.' });
        }

        if (coupon.minPurchase > cart.totalPrice) {
            return res.status(400).json({ message: `You have to purchase at least ${coupon.minPurchase} to use this coupon.` });
        }

        let discount;
        if (coupon.isPercent) {
            discount = (cart.totalPrice * coupon.amount) / 100
        } else {
            discount = coupon.amount
        }

        if (discount > cart.totalPrice) {
            discount = cart.totalPrice
        }
        cart.totalPrice -= discount; 
        cart.discount = discount
        cart.appliedCoupon = couponCode;
        await cart.save();

        res.json({ message: 'Coupon applied successfully!', newTotal: cart.totalPrice });
    } catch (error) {
        console.error('Error applying coupon:', error);
        res.status(500).json({ message: 'Failed to apply coupon. Please try again later.' });
    }
}

const removeCoupon = async (req, res) => {
    const userId = req.userId;

    try {
        const cart = await Cart.findOne({ user: userId })
        if (!cart || !cart.appliedCoupon) {
            return res.status(404).json({ message: 'No coupon applied or cart not found.' })
        }

        const coupon = await Coupons.findOne({ code: cart.appliedCoupon })
        if (!coupon) {
            return res.status(404).json({ message: 'Coupon not found.' })
        }

        cart.totalPrice+=cart.discount
        
        cart.discount =0
        cart.appliedCoupon = null
        await cart.save()

        res.json({ message: 'Coupon removed successfully!', newTotal: cart.totalPrice })
    } catch (error) {
        console.error('Error removing coupon:', error)
        res.status(500).json({ message: 'Failed to remove coupon. Please try again later.' })
    }
}
const renderWallet = async(req,res)=>{
    try {
        const id= req.userId
        console.log(id);
        
        const wallet = await Wallet.findOne({user:id}).populate({
            path:'transactions',
            ref:'Transactions',
            options: { sort: { createdAt: -1 } } 
        })
        console.log(wallet);
        
        res.render('wallet',{wallet})
    } catch (error) {
        console.log(error);
        
    }
}

const renderReturn =  async(req,res)=>{
    const itemId=req.query.id
    const orderId=req.query.orderId    
    const id=req.userId
    try {
        const order = await Order.find({ user: id, _id: orderId })
  .populate({
    path: 'items',
    match: { _id: itemId }, 
    populate: {
      path: 'productId',
      model: 'Product'
    }
  });

    if(!order){
        return res.status(500).json({ success: false, message: "Something went worng!! Please try again", error: error.message })
    }
    res.render('returnProduct',{order})
    } catch (error) {
        console.log(error)
    }
}

const returnRequest= async(req,res)=>{
    const itemId = req.query.id;
    const orderId = req.query.orderId;
    const reason = req.body.reason;
    try {
        if (!reason) {
            return res.status(400).json({ message: "Cancellation reason is required." });
        }
        
        const orderItem = await OrderItem.findById(itemId);
        if (!orderItem) {
            return res.status(404).json({ message: "Order item not found." });
        }

        const order = await Order.findById(orderId).populate('items');
        if (!order) {
            return res.status(404).json({ message: "Order not found." });
        }
        await OrderItem.findByIdAndUpdate(
            { _id: itemId },
            { $set: { orderStatus: 'returned', reason: reason } },
            { new: true }
        )
        return res.redirect(`/user/account/view-order?id=${orderId}`);

    } catch (error) {
        console.log(error);
        
    }
}
const downloadInvoice = async (req, res) => {
    const { id } = req.params;
    console.log(id);
    
    try {
        const order = await Order.findById(id)
  .populate({
    path: 'items',
    populate: {
      path: 'productId',
      model: 'Product'
    }
  })

     
        const doc = new PDFDocument({ margin: 30 });

        
        const filePath = path.join(__dirname,'\downloads');
        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

   
        doc
            .fontSize(16)
            .text('LucidLayers', 120, 20)
            .fontSize(10)
            .text('Edapally', { continued: true })
            .text('Kochi, Kerala, 217231')
            .text('Phone: +7012872516')
            .text('Email: lucidlayers079@gmail.com');

        doc.moveDown();

       
        doc.fontSize(12).text(`Order Number: ${order.orderNo}`);
        doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`);
        doc.text(`Customer: ${order.address.firstName} ${order.address.lastName}`);
        doc.text(`Address: ${order.address.companyName},${order.address.street} ${order.address.apartment},${order.address.city}, ${order.address.state}, ${order.address.country} - ${order.address.pincode}`);
        doc.moveDown();

        
        doc.fontSize(12).text('Product', 50, 180, { width: 200, align: 'left' })
            .text('Quantity', 250, 180, { width: 100, align: 'center' })
            .text('Price', 350, 180, { width: 100, align: 'center' })
            .text('Total', 450, 180, { width: 100, align: 'center' });
        doc.moveTo(50, 200).lineTo(550, 200).stroke();

        
        let yPosition = 210;
        order.items.forEach((item) => {
            const productName = item.productId ? item.productId.name : 'Product not found';
            doc.fontSize(10)
                .text(productName, 50, yPosition, { width: 200, align: 'left' })
                .text(item.quantity, 250, yPosition, { width: 100, align: 'center' })
                .text(`Rs ${item.price.toFixed(2)}`, 350, yPosition, { width: 100, align: 'center' })
                .text(`Rs ${(item.price * item.quantity).toFixed(2)}`, 450, yPosition, { width: 100, align: 'center' });
            yPosition += 20;
        });

      
        doc.moveDown();
        doc.text(`Subtotal: Rs ${order.totalPrice.toFixed(2)}`, 400, yPosition + 20, { align: 'right' });
        doc.text(`Discount: Rs ${order.discount ? order.discount.toFixed(2) : '0.00'}`, 400, yPosition + 40, { align: 'right' });
        doc.text(`Total: Rs ${(order.totalPrice - (order.discount || 0)).toFixed(2)}`, 400, yPosition + 60, { align: 'right' });

    
        doc.moveDown().text('Thanks for purchasing from LucidLayers', 50, yPosition + 100, { align: 'center' });

       
        doc.end();

        writeStream.on('finish', () => {
            res.download(filePath, `invoice-${order._id}.pdf`, (err) => {
                if (err) {
                    console.error('Error downloading the invoice:', err);
                }
                fs.unlinkSync(filePath); 
            });
        });

        writeStream.on('error', (err) => {
            console.error('Error writing PDF:', err);
            res.status(500).send('Error generating the invoice.');
        });
    } catch (error) {
        console.error('Error fetching order or generating invoice:', error);
        res.status(500).send('Internal server error.');
    }
};
// 
const getReferal = async (req, res) => {
    const id = req.userId;
    
    try {
        const user = await User.findById(id);

        if (user.referalCode) {
            res.status(200).send({ success: true, referalcode: user.referalCode });
        } else {
            const generateUniqueCode = () => {
                return `REF-${crypto.randomBytes(4).toString("hex").toUpperCase()}`; 
            };

            let newReferalCode = generateUniqueCode();
            
            while (await User.findOne({ referalCode: newReferalCode })) {
                newReferalCode = generateUniqueCode();
            }
            user.referalCode = newReferalCode;
            await user.save();
            res.status(200).send({ success: true, referralcode: newReferalCode });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, message: "Something went wrong" });
    }
};


module.exports = {
    renderHome,
    logout,
    renderShop,
    renderProductDetails,
    renderUserDetails,
    softedit,
    userPassword,
    renderaddresses,
    renderAddAddress,
    newAddress,
    deleteAddress,
    renderEditAddress,
    editAddress,
    renderUserdashboard,
    addItemToCart,
    renderCart,
    UpdateCartQuantity,
    removeCartItem,
    rendercheckOut,
    renderOrderSuccess,
    createOrder,
    renderOrders,
    renderOrderdetails,
    rendercancelitem,
    cancelOrderitem,
    renderCancelConfirm,
    cancelOrder,
    updateCartQuantity,
    proceedtoCheckout,
    addtoWishlist,
    removeFromWishlist,
    renderWishlist,
    verifyPaymentAndCreateOrder,
    showCoupons,
    applyCoupon,
    removeCoupon,
    renderWallet,
    renderReturn,
    returnRequest,
    createPendingOrder,
    retryPayment,
    downloadInvoice,
    getReferal,
    Chatbot
}