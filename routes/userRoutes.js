const express=require('express')
const router= express.Router()
const cartMiddleware = require ('../middleware/cartitems')
const {CartItem,Cart} = require('../models/cartModels')


const {renderHome,logout,renderShop,renderProductDetails,renderUserDetails,

    softedit,userPassword,renderaddresses,renderAddAddress,newAddress,deleteAddress,

    renderEditAddress,editAddress,renderUserdashboard,addItemToCart,renderCart,

    UpdateCartQuantity,removeCartItem,rendercheckOut,

    renderOrderSuccess,createOrder,renderOrders,renderOrderdetails,rendercancelitem,

    cancelOrderitem,renderCancelConfirm,cancelOrder,updateCartQuantity,proceedtoCheckout,

    removeFromWishlist,addtoWishlist,renderWishlist,verifyPaymentAndCreateOrder,showCoupons,applyCoupon,
    
    removeCoupon}=require('../controllers/userControllers')





router.route('/home').get(renderHome)
router.route('/logout').get(logout)
router.route('/shop').get(renderShop)
router.route('/product-details/:id').get(renderProductDetails)

//myaccount section
router.route('/account').get(renderUserdashboard)
router.route('/account-details').get(renderUserDetails)
router.route('/account/soft-edit').put(softedit)
router.route('/account/password-change').put(userPassword)
router.route('/account/address').get(renderaddresses)
router.route('/account/add-address').get(renderAddAddress).post(newAddress)
router.route('/account/delete-address/:id').get(deleteAddress)
router.route('/account/edit-address/:id').get(renderEditAddress).post(editAddress)
router.route('/account/orders').get(renderOrders)

//cart section
router.route('/add-to-cart/:id').post(addItemToCart)
router.route('/cart').get(renderCart).post(proceedtoCheckout)
router.route('/remove-from-cart/:id').get(removeCartItem)
router.route('/cart/update').post(updateCartQuantity)

//wishlist section 
router.route('/remove-from-wishlist').post(removeFromWishlist)
router.route('/add-to-wishlist').post(addtoWishlist)
router.route("/wishlist").get(renderWishlist)


//order section
router.route('/checkout-order').get(rendercheckOut)
router.route('/checkout-order/add-address').post(newAddress)
router.route('/place-order').post(createOrder)
router.route('/verify-payment').post(verifyPaymentAndCreateOrder)
router.route('/order/confirmation/:id').get(renderOrderSuccess)
router.route('/account/view-order').get(renderOrderdetails)
router.route('/account/orders/confirm-cancel-item').get(rendercancelitem).post(cancelOrderitem)
router.route('/account/cancel-order').get(renderCancelConfirm).post(cancelOrder)
router.route('/coupons').get(showCoupons)
router.route('/checkout-order/apply-coupon').post(applyCoupon)
router.route('/checkout-order/remove-coupon').post(removeCoupon)

module.exports=router