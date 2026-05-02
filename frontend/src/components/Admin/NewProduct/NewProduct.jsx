import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  MdDriveFileRenameOutline, MdAttachMoney,
  MdDescription, MdCategory, MdInventory,
} from "react-icons/md";
import MetaData from "../../layouts/Header/MetaData";
import Loader from "../../layouts/Loader/Loader";
import AdminLayout from "../AdminLayout";
import { createProduct, resetProductOps, clearProductOpsError } from "../../../store/slices/productSlice";
import { toastifyOptions } from "../../../utils/toastify";
import "../NewProduct/NewProduct.css";

const CATEGORIES = ["Fruits", "Vegetables", "Dairy", "Grains", "Protein", "Beverages", "Snacks"];

const NewProduct = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, success, error } = useSelector((s) => s.productOpsR);

  const [name,        setName]        = useState("");
  const [price,       setPrice]       = useState("");
  const [description, setDescription] = useState("");
  const [category,    setCategory]    = useState("");
  const [stock,       setStock]       = useState("");
  const [images,      setImages]      = useState([]);
  const [previews,    setPreviews]    = useState([]);

  useEffect(() => {
    if (error)   { toast.error(error, { ...toastifyOptions });           dispatch(clearProductOpsError()); }
    if (success) { toast.success("Product created!", { ...toastifyOptions }); dispatch(resetProductOps()); navigate("/admin/products"); }
  }, [error, success, dispatch, navigate]);

  const handleImages = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setPreviews([]);
    setImages([]);

    const readers = files.map((file) =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result); // full data URI: data:image/jpeg;base64,...
        reader.readAsDataURL(file);
      })
    );

    // Wait for ALL files before setting state — avoids partial state updates
    Promise.all(readers).then((results) => {
      setPreviews(results);
      setImages(results);
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (images.length === 0) {
      toast.error("Please upload at least one image", { ...toastifyOptions });
      return;
    }

    // Send plain JSON — NOT FormData
    // Backend expects base64 strings in the images array
    dispatch(createProduct({ name, price, description, category, stock, images }));
  };

  if (loading) return <Loader />;

  return (
    <AdminLayout>
      <MetaData title="Create Product — Admin" />
      <h1 className="admin-page-title">Create Product</h1>
      <div className="admin-form-card">
        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="admin-field">
            <div className="admin-input-wrap">
              <MdDriveFileRenameOutline />
              <input
                type="text" placeholder="Product name" required
                value={name} onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="admin-field">
            <div className="admin-input-wrap">
              <MdAttachMoney />
              <input
                type="number" placeholder="Price (৳)" required
                value={price} onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="admin-field">
            <div className="admin-input-wrap" style={{ alignItems: "flex-start" }}>
              <MdDescription style={{ marginTop: "2px" }} />
              <textarea
                rows={3} placeholder="Product description" required
                value={description} onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="admin-field">
            <div className="admin-input-wrap">
              <MdCategory />
              <select required value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Select category</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="admin-field">
            <div className="admin-input-wrap">
              <MdInventory />
              <input
                type="number" placeholder="Stock quantity" required
                value={stock} onChange={(e) => setStock(e.target.value)}
              />
            </div>
          </div>

          <div className="admin-field">
            <label className="admin-upload-label">
              📷 Upload Images
              <input
                type="file" accept="image/*" multiple
                onChange={handleImages}
                style={{ display: "none" }}
              />
            </label>
            {previews.length > 0 && (
              <div className="admin-image-previews">
                {previews.map((src, i) => (
                  <img key={i} src={src} alt={`preview-${i}`} />
                ))}
              </div>
            )}
          </div>

          <button type="submit" className="btn btn--primary" disabled={loading || images.length === 0}>
            Create Product
          </button>
        </form>
      </div>
    </AdminLayout>
  );
};

export default NewProduct;