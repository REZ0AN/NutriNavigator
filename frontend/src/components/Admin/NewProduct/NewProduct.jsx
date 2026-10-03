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
      <h1 className="mb-6 font-body text-2xl font-bold text-brand-900">Create Product</h1>
      <div className="max-w-[600px] rounded-card border border-admin-border bg-white p-5 shadow-sm sm:p-8">
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2 [&_label]:font-body [&_label]:text-sm [&_label]:font-medium [&_label]:text-earth-600">
            <div className="flex items-center gap-3 rounded-lg border border-brand-300 bg-admin-canvas px-4 py-3 focus-within:border-brand-700 focus-within:bg-white [&_svg]:shrink-0 [&_svg]:text-lg [&_svg]:text-admin-muted [&_input]:min-w-0 [&_input]:flex-1 [&_input]:border-0 [&_input]:bg-transparent [&_input]:font-body [&_input]:text-sm [&_input]:text-earth-900 [&_input]:outline-none [&_select]:min-w-0 [&_select]:flex-1 [&_select]:bg-transparent [&_select]:font-body [&_select]:text-sm [&_select]:text-earth-900 [&_textarea]:min-w-0 [&_textarea]:flex-1 [&_textarea]:bg-transparent [&_textarea]:font-body [&_textarea]:text-sm [&_textarea]:text-earth-900">
              <MdDriveFileRenameOutline />
              <input
                type="text" placeholder="Product name" required
                value={name} onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 [&_label]:font-body [&_label]:text-sm [&_label]:font-medium [&_label]:text-earth-600">
            <div className="flex items-center gap-3 rounded-lg border border-brand-300 bg-admin-canvas px-4 py-3 focus-within:border-brand-700 focus-within:bg-white [&_svg]:shrink-0 [&_svg]:text-lg [&_svg]:text-admin-muted [&_input]:min-w-0 [&_input]:flex-1 [&_input]:border-0 [&_input]:bg-transparent [&_input]:font-body [&_input]:text-sm [&_input]:text-earth-900 [&_input]:outline-none [&_select]:min-w-0 [&_select]:flex-1 [&_select]:bg-transparent [&_select]:font-body [&_select]:text-sm [&_select]:text-earth-900 [&_textarea]:min-w-0 [&_textarea]:flex-1 [&_textarea]:bg-transparent [&_textarea]:font-body [&_textarea]:text-sm [&_textarea]:text-earth-900">
              <MdAttachMoney />
              <input
                type="number" placeholder="Price (৳)" required
                value={price} onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 [&_label]:font-body [&_label]:text-sm [&_label]:font-medium [&_label]:text-earth-600">
            <div className="flex items-center gap-3 rounded-lg border border-brand-300 bg-admin-canvas px-4 py-3 focus-within:border-brand-700 focus-within:bg-white [&_svg]:shrink-0 [&_svg]:text-lg [&_svg]:text-admin-muted [&_input]:min-w-0 [&_input]:flex-1 [&_input]:border-0 [&_input]:bg-transparent [&_input]:font-body [&_input]:text-sm [&_input]:text-earth-900 [&_input]:outline-none [&_select]:min-w-0 [&_select]:flex-1 [&_select]:bg-transparent [&_select]:font-body [&_select]:text-sm [&_select]:text-earth-900 [&_textarea]:min-w-0 [&_textarea]:flex-1 [&_textarea]:bg-transparent [&_textarea]:font-body [&_textarea]:text-sm [&_textarea]:text-earth-900" style={{ alignItems: "flex-start" }}>
              <MdDescription style={{ marginTop: "2px" }} />
              <textarea
                rows={3} placeholder="Product description" required
                value={description} onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 [&_label]:font-body [&_label]:text-sm [&_label]:font-medium [&_label]:text-earth-600">
            <div className="flex items-center gap-3 rounded-lg border border-brand-300 bg-admin-canvas px-4 py-3 focus-within:border-brand-700 focus-within:bg-white [&_svg]:shrink-0 [&_svg]:text-lg [&_svg]:text-admin-muted [&_input]:min-w-0 [&_input]:flex-1 [&_input]:border-0 [&_input]:bg-transparent [&_input]:font-body [&_input]:text-sm [&_input]:text-earth-900 [&_input]:outline-none [&_select]:min-w-0 [&_select]:flex-1 [&_select]:bg-transparent [&_select]:font-body [&_select]:text-sm [&_select]:text-earth-900 [&_textarea]:min-w-0 [&_textarea]:flex-1 [&_textarea]:bg-transparent [&_textarea]:font-body [&_textarea]:text-sm [&_textarea]:text-earth-900">
              <MdCategory />
              <select required value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Select category</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2 [&_label]:font-body [&_label]:text-sm [&_label]:font-medium [&_label]:text-earth-600">
            <div className="flex items-center gap-3 rounded-lg border border-brand-300 bg-admin-canvas px-4 py-3 focus-within:border-brand-700 focus-within:bg-white [&_svg]:shrink-0 [&_svg]:text-lg [&_svg]:text-admin-muted [&_input]:min-w-0 [&_input]:flex-1 [&_input]:border-0 [&_input]:bg-transparent [&_input]:font-body [&_input]:text-sm [&_input]:text-earth-900 [&_input]:outline-none [&_select]:min-w-0 [&_select]:flex-1 [&_select]:bg-transparent [&_select]:font-body [&_select]:text-sm [&_select]:text-earth-900 [&_textarea]:min-w-0 [&_textarea]:flex-1 [&_textarea]:bg-transparent [&_textarea]:font-body [&_textarea]:text-sm [&_textarea]:text-earth-900">
              <MdInventory />
              <input
                type="number" placeholder="Stock quantity" required
                value={stock} onChange={(e) => setStock(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 [&_label]:font-body [&_label]:text-sm [&_label]:font-medium [&_label]:text-earth-600">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-brand-300 bg-brand-50 px-5 py-3 font-body text-sm text-brand-900 hover:border-brand-900 hover:bg-cream-100">
              📷 Upload Images
              <input
                type="file" accept="image/*" multiple
                onChange={handleImages}
                style={{ display: "none" }}
              />
            </label>
            {previews.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3 [&_img]:h-[78px] [&_img]:w-[78px] [&_img]:rounded-lg [&_img]:border [&_img]:border-admin-border [&_img]:bg-cream-50 [&_img]:p-1 [&_img]:object-contain">
                {previews.map((src, i) => (
                  <img key={i} src={src} alt={`preview-${i}`} />
                ))}
              </div>
            )}
          </div>

          <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 px-6 py-2.5 font-body text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 border-transparent bg-brand-900 text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700" disabled={loading || images.length === 0}>
            Create Product
          </button>
        </form>
      </div>
    </AdminLayout>
  );
};

export default NewProduct;
