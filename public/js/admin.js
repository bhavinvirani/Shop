const btn = document.getElementById("deleteAdminProdect");
const deleteProduct = () => {
    const prodId =  btn.parentNode.querySelector('[name=productId]').value;
    const csrf =  btn.parentNode.querySelector('[name=_csrf]').value;

    const productElement = btn.closest('article')   //* select nearest article tag from btn

    //* DELETE fetch method
    fetch('/admin/product/' + prodId, {
        method: 'DELETE',
        headers: {
            'csrf-token': csrf          //* set csrf token to heder
        }
    }).then((result) => {
        return result.json();           //* return json data which
    })
    .then(data => {
        console.log(data);
        productElement.remove(productElement);           //* new browsers
        // productElement.parentNode.removeChild(productElement);        //* for all browsers

    })
    .catch(err => console.log(err))
};
btn.addEventListener("click", deleteProduct)
