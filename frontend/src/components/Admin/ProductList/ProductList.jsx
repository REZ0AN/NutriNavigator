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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-6)" }}>
        <h1 className="admin-page-title" style={{ margin: 0 }}>All Products</h1>
        <Link to="/admin/product" className="btn btn--primary">+ New Product</Link>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>ID</th><th>Name</th><th>Stock</th><th>Price (৳)</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {products?.map((p) => (
              <tr key={p._id}>
                <td style={{ fontFamily: "monospace", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>{p._id}</td>
                <td>{p.name}</td>
                <td><span className={p.stock < 1 ? "redColor" : "greenColor"}>{p.stock}</span></td>
                <td>৳{p.price?.toLocaleString()}</td>
                <td>
                  <div className="admin-actions-cell">
                    <Link to={`/admin/product/${p._id}`} className="admin-action-btn admin-action-btn--edit"><MdEdit /></Link>
                    <button className="admin-action-btn admin-action-btn--delete" onClick={() => dispatch(deleteProduct(p._id))}><MdDelete /></button>
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
