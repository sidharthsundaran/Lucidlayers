const express=require('express')
const router=express.Router()
const multer = require('multer');
const {storage,
    imageFilter,
    upload}=require("../utility/upload") 
// const upload = multer({ storage: storage }).array('images', 5); 
const {renderDashboard,renderUsers,renderProduct,renderAddProduct,addProduct,renderCategories,addCategory,deleteCategory,renderEditCategories,editCategory,renderEditProduct,editProduct,renderViewProduct,blockUSer, unblockUser,archiveProduct,unarchiveProduct,renderAdminOrders,
    renderadminOrderdetails,changeOrderStatus,
    renderaddOffer,renderOffersList,newOffer,listOffers,unlistOffers,deleteOffers,renderAddCoupon,
    createCoupon}=require('../controllers/adminController')


router.route('/dashboard').get(renderDashboard)

router.route('/users').get(renderUsers)
router.route('/users/blockuser/:id').get(blockUSer)
router.route('/users/unblockuser/:id').get(unblockUser)

router.route('/categories').get(renderCategories).post(addCategory)
router.route('/categories/delete').get(deleteCategory)
router.route('/categories/edit/:id').get(renderEditCategories).post(editCategory)

router.route('/products').get(renderProduct)
router.route('/newproducts').get(renderAddProduct).post(upload.array('images', 10),addProduct)
router.route('/products/edit/:id').get(renderEditProduct).post(upload.array('newImages',10),editProduct)
router.route('/products/view/:id').get(renderViewProduct)
router.route('/products/archive-products/:id').get(archiveProduct)
router.route('/products/unarchive-products/:id').get(unarchiveProduct)

router.route('/order-list').get(renderAdminOrders)
router.route('/order-details').get(renderadminOrderdetails).post(changeOrderStatus)

router.route('/new-Offer').get(renderaddOffer).post(newOffer)
router.route('/offers').get(renderOffersList)
router.route('/offers/unlist/:id').get(unlistOffers)
router.route('/offers/list/:id').get(listOffers)
router.route('/offers/delete/:id').delete(deleteOffers)


router.route('/create-coupon').get(renderAddCoupon).post(createCoupon)

module.exports= router