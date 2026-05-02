import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { MdDriveFileRenameOutline, MdAttachMoney, MdDescription, MdCategory, MdInventory } from "react-icons/md";
import MetaData from "../../layouts/Header/MetaData";
import Loader from "../../layouts/Loader/Loader";
import AdminLayout from "../AdminLayout";
import { getProductDetails, updateProduct, resetProductOps, clearProductOpsError } from "../../../store/slices/productSlice";
import { toastifyOptions } from "../../../utils/toastify";
import "../NewProduct/NewProduct.css";

const CATEGORIES = ["Fruits", "Vegetables", "Dairy", "Grains", "Protein", "Beverages", "Snacks"];

const UpdateProduct = () => {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const { id }    = useParams();
  const { loading: detailLoading, product } = useSelector((s) => s.productR);
  const { loading, isUpdated, error } = useSelector((s) => s.productOpsR);

  const [name, setName]             = useState("");
  const [price, setPrice]           = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory]     = useState("");
  const [stock, setStock]           = useState("");
  const [images, setImages]         = useState([]);
  const [oldImages, setOldImages]   = useState([]);
  const [previews, setPreviews]     = useState([]);

  useEffect(() => {
    if (product?._id !== id) {
      dispatch(getProductDetails(id));
    } else {
      setName(product.name || ""); setPrice(product.price || "");
      setDescription(product.description || ""); setCategory(product.category || "");
      setStock(product.stock || ""); setOldImages(product.images || []);
    }
    if (error)     { toast.error(error, { ...toastifyOptions });             dispatch(clearProductOpsError()); }
    if (isUpdated) { toast.success("Product updated!", { ...toastifyOptions }); dispatch(resetProductOps()); navigate("/admin/products"); }
  }, [product, id, error, isUpdated, dispatch, navigate]);

  const handleImages = (e) => {
    const files = Array.from(e.target.files);
    setOldImages([]); setImages([]); setPreviews([]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.readyState === 2) {
          setPreviews((p) => [...p, reader.result]);
          setImages((p) => [...p, reader.result]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const form = new FormData();
    form.set("name", name); form.set("price", price); form.set("description", description);
    form.set("category", category); form.set("stock", stock);
    images.forEach((img) => form.append("images", img));
    dispatch(updateProduct({ id, productData: form }));
  };

  if (detailLoading || loading) return <Loader />;

  return (
    <AdminLayout>
      <MetaData title="Update Product — Admin" />
      <h1 className="admin-page-title">Update Product</h1>
      <div className="admin-form-card">
        <form className="admin-form" onSubmit={handleSubmit} encType="multipart/form-data">
          {[
            { icon: MdDriveFileRenameOutline, placeholder: "Product name", value: name,  setter: setName,  type: "text" },
            { icon: MdAttachMoney,            placeholder: "Price (৳)",    value: price, setter: setPrice, type: "number" },
          ].map(({ icon: Icon, placeholder, value, setter, type }) => (
            <div key={placeholder} className="admin-field">
              <div className="admin-input-wrap">
                <Icon /><input type={type} placeholder={placeholder} required value={value} onChange={(e) => setter(e.target.value)} />
              </div>
            </div>
          ))}
          <div className="admin-field">
            <div className="admin-input-wrap" style={{ alignItems: "flex-start" }}>
              <MdDescription style={{ marginTop: "2px" }} />
              <textarea rows={3} placeholder="Product description" required value={description} onChange={(e) => setDescription(e.target.value)} />
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
              <MdInventory /><input type="number" placeholder="Stock quantity" required value={stock} onChange={(e) => setStock(e.target.value)} />
            </div>
          </div>
          <div className="admin-field">
            <label className="admin-upload-label">
              📷 Replace Images
              <input type="file" accept="image/*" multiple onChange={handleImages} style={{ display: "none" }} />
            </label>
            <div className="admin-image-previews">
              {oldImages.map((img, i) => <img key={`old-${i}`} src={img.url} alt="existing" />)}
              {previews.map((src, i)   => <img key={`new-${i}`} src={src}    alt="new" />)}
            </div>
          </div>
          <button type="submit" className="btn btn--primary" disabled={loading}>Update Product</button>
        </form>
      </div>
    </AdminLayout>
  );
};

export default UpdateProduct;
