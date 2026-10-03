import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { MdEdit, MdDelete } from "react-icons/md";
import MetaData from "../../layouts/Header/MetaData";
import AdminLayout from "../AdminLayout";
import { getAllAdminProducts, deleteProduct, resetProductOps, clearProductOpsError } from "../../../store/slices/productSlice";
import { toastifyOptions } from "../../../utils/toastify";

const ProductList = () => {
  const dispatch  = useDispatch();
  const { products, error } = useSelector((s) => s.productsR);
  const { isDeleted, error: opsError } = useSelector((s) => s.productOpsR);

useEffect(() => {
  if (error)    { toast.error(error, { ...toastifyOptions });    dispatch(clearProductOpsError()); }
  if (opsError) { toast.error(opsError, { ...toastifyOptions }); dispatch(clearProductOpsError()); }
  if (isDeleted) { toast.success("Product deleted", { ...toastifyOptions }); dispatch(resetProductOps()); }
}, [error, opsError, isDeleted, dispatch]);

useEffect(() => {
  if (products.length === 0) {
    dispatch(getAllAdminProducts());
  }
}, [dispatch, products.length]);

  return (
    <AdminLayout>
      <MetaData title="All Products — Admin" />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-body text-2xl font-bold text-brand-900">All Products</h1>
        <Link to="/admin/product" className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 px-6 py-2.5 font-body text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 border-transparent bg-brand-900 text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">+ New Product</Link>
      </div>
      <div className="overflow-x-auto rounded-card border border-admin-border bg-white shadow-sm">
        <table className="w-full border-collapse font-body [&_th]:whitespace-nowrap [&_th]:bg-brand-900 [&_th]:px-5 [&_th]:py-4 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-white [&_td]:border-b [&_td]:border-admin-border [&_td]:px-5 [&_td]:py-4 [&_td]:align-middle [&_td]:text-sm [&_td]:text-earth-600">
          <thead>
            <tr><th>ID</th><th>Name</th><th>Stock</th><th>Price (৳)</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {products?.map((p) => (
              <tr key={p._id}>
                <td className="font-mono text-xs text-admin-muted">{p._id}</td>
                <td>{p.name}</td>
                <td><span className={p.stock < 1 ? "font-semibold text-red-700" : "font-semibold text-green-700"}>{p.stock}</span></td>
                <td>৳{p.price?.toLocaleString()}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <Link to={`/admin/product/${p._id}`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-lg text-blue-700 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"><MdEdit /></Link>
                    <button className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-lg text-red-700 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-700" onClick={() => dispatch(deleteProduct(p._id))}><MdDelete /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
};

export default ProductList;
