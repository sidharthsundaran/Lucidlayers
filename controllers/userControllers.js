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
const Coupons = require('../models/discountModel')


const razorpay = new Razorpay({
    key_id: process.env.RZP_KEY_ID,
    key_secret: process.env.RZP_KEY_SECRET,
});





const renderHome = async (req, res) => {
    console.log("home page");
    res.render('landingPage')
}

const logout = async (req, res) => {

    res.clearCookie("refreshToken");
    res.clearCookie('accessToken')
    return res.redirect('/auth/login')
}



const renderShop = async (req, res) => {
    const sortOption = req.query.sort || 'default';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 3;
    const skip = (page - 1) * limit;

    const categoryId = req.query.category;
    const priceRange = req.query.price;
    const size = req.query.size;
    const color = req.query.color;
    const searchQuery = req.query.search;
    const userId= req.userId

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
        }).skip(skip).limit(limit).sort(sortOption);
    } else {
        productResults = await products.find(filterCriteria).skip(skip).limit(limit).sort(sortOption);
    }

    const totalProducts = await products.countDocuments({
        ...filterCriteria,
        ...(searchQuery ? { name: { $regex: searchQuery, $options: 'i' } } : {})
    });
    const totalPages = Math.ceil(totalProducts / limit);

    const categorydata = await categories.find();
    const wishList = await WishList.findOne({ user: userId });

    const wishlist = wishList ? wishList.products : [];
    res.render('shop', {
        productData: productResults,
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
    const id = req.params.id
    const data = await products.findById(id)
    res.render('product-details', { data })
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
    console.log("ss");
    
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

        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            cart = new Cart({ user: userId });
            await cart.save();
        }

        let cartItem = await CartItem.findOne({ product: productId, size: selectedSize, });
        
        if (cartItem) {
            cartItem.quantity += quantity;
            await cartItem.save();
        } else {

            cartItem = new CartItem({
                product: productId,
                quantity,
                price: sizeVariation.price,
                size: selectedSize,
                cart: cart._id  
            });
            await cartItem.save();
            cart.cartItems.push(cartItem._id);
        }

        cart.totalQuantity += quantity;
        cart.totalPrice += sizeVariation.price * quantity;
        await cart.save();
        const wishlistUpdate = await WishList.findOne({user:userId})
        console.log(wishlistUpdate);
        
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
        res.status(500).json({ message: 'Error adding item to cart' });
    }
};


const renderCart = async (req, res) => {
    try {
        const userId = req.userId; 
        const cart = await Cart.findOne({ user: userId }).populate({
            path: 'cartItems',
            populate: {
                path: 'product',
                model: 'Product' 
            }
        });

        if (!cart) {
            return res.render('cart', { cart: null }); 
        }

        let totalQuantity = 0;
        let totalPrice = 0;

        cart.cartItems.forEach(item => {
            totalQuantity += item.quantity;
            totalPrice += item.price * item.quantity; 
        });
        cart.totalQuantity = totalQuantity;
        cart.totalPrice = totalPrice;
        await cart.save()        
        res.render('cart', { cart })
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching cart')
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
    const id = req.userId;
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

        item.quantity = quantity; 
        await item.save();

        const updatedPrice = item.price * item.quantity; 

        const cart = await Cart.findOne({ user: id }).populate('cartItems')
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
        await cart.save()


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
        const coupon= await Coupons.find()
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
        console.log(id);
        
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
    
        if (paymentMethod === 'Razorpay') {
            const razorpayOrder = await razorpay.orders.create({
                amount: cart.totalPrice * 100, // Amount in paise
                currency: 'INR',
                receipt: orderNo.toString(),
                payment_capture: 1, // Auto capture payment
            });
            
            return res.status(200).json({
                success: true,
                message: "Razorpay order created successfully",
                key:process.env.RZP_KEY_ID,
                razorpayOrderId: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
            });
        } else {
            const newOrder = new Order({
                user: userId,
                address,
                items: [],
                totalQuantity: cart.totalQuantity,
                totalPrice: cart.totalPrice,
                paymentMethod,
                orderNo,
                orderStatus: 'pending',
                discount:cart.discount
            });

        
            for (const cartItem of cart.cartItems) {
                const { product, quantity, size } = cartItem;
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
                    price: sizeVariation.price,
                    status: 'pending',
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
    console.log("signature:",signature)
    const userId = req.userId
    const generatedSignature = crypto.createHmac('sha256', process.env.RZP_KEY_SECRET)
        .update(order_id + '|' + payment_id)
        .digest('hex');  
    if (generatedSignature === signature) {
        try {
            const cart = await Cart.findOne({ user: userId }).populate({
                path: 'cartItems',
                populate: { path: 'product', select: 'name price stock sizeVariations' }
            });

            if (!cart || cart.cartItems.length === 0) {
                return res.status(400).json({ message: "Your cart is empty." });
            }

            const orderNo = await Order.getNextOrderNumber();
            const address = await Address.findById(addressId);

            const newOrder = new Order({
                user: userId,
                address,
                items: [],
                totalQuantity: cart.totalQuantity,
                totalPrice: cart.totalPrice,
                paymentMethod: 'Razorpay',
                orderNo,
                orderStatus: 'confirmed',
                discount:cart.discount
            });

            for (const cartItem of cart.cartItems) {
                const { product, quantity, size } = cartItem;
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
                    price: sizeVariation.price,
                    status: 'confirmed', 
                });

                await orderItem.save();
                newOrder.items.push(orderItem)

                sizeVariation.stock -= quantity
                await productDoc.save()
            }
            await newOrder.save()
            await CartItem.deleteMany({ _id: { $in: cart.cartItems.map(item => item._id) } })
            cart.cartItems = []
            cart.totalQuantity = 0
            cart.totalPrice = 0
            await cart.save()
            return res.status(200).json({ success: true, message: "Order placed successfully", orderId: newOrder._id })
        } catch (error) {
            console.error("Error creating order:", error)
            return res.status(500).json({ success: false, message: "Error creating order", error: error.message })
        }
    } else {
        return res.status(400).json({
            success: false,
            message: 'Payment verification failed. Invalid signature.',
        })
    }
}


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
        res.render('orders',{orders})
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
        console.log(orderItem.quantity);
        const cancel = await OrderItem.findByIdAndUpdate(
            { _id: itemId },
            { $set: { orderStatus: 'canceled', reason: reason } },
            { new: true }
        );

        if (cancel) {
            const productDoc = await products.findById(orderItem.productId);
            if (productDoc) {
                const sizeVariation = productDoc.sizeVariations.find(s => s.size === orderItem.size);
                console.log(orderItem.quantity);
                if (sizeVariation) {
                    console.log(sizeVariation);
                    sizeVariation.stock += orderItem.quantity;
                    await productDoc.save();
                }
            }
        }
        const order = await Order.findById(orderId).populate('items');
        if (!order) {
            return res.status(404).json({ message: "Order not found." });
        }

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

        const cancel = await Order.findByIdAndUpdate(
            { _id: orderId },
            { $set: { orderStatus: 'canceled', reason: reason } },
            { new: true }
        )

        const itemUpdatePromises = order.items.map(async (item) => {
            if (item.orderStatus === 'canceled') {
                return
            }
            await OrderItem.findByIdAndUpdate(
                item._id,
                { $set: { orderStatus: 'canceled' } },
                { new: true }
            )
            const productDoc = await products.findById(item.productId);
            if (productDoc) {
                const sizeVariation = productDoc.sizeVariations.find(s => s.size === item.size);
                if (sizeVariation) {
                    sizeVariation.stock += item.quantity;
                    await productDoc.save();
                }
            }
        })
        await Promise.all(itemUpdatePromises);
        return res.redirect(`/user/account/orders`);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "An error occurred while canceling the order." })
    }
}

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
            })            
        if (!wishlist) {
            return res.render("wishlist", { wishlist: null });
        }
        res.render("wishlist", { wishlist });
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
        console.log(discount);
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
    console.log('hi');

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
    removeCoupon


}