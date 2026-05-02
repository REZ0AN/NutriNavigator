/**
 * Chainable query builder for product filtering, searching, and pagination.
 */
class ApiFeatures {
    /**
     * @param {mongoose.Query} query       - Base Mongoose query
     * @param {Object}         queryString - Parsed request query params
     */
    constructor(query, queryString) {
        this.query = query;
        this.queryString = queryString;
    }

    /** Apply keyword search on the `name` field (case-insensitive). */
    search() {
        const keyword = this.queryString.keyword
            ? { name: { $regex: this.queryString.keyword, $options: "i" } }
            : {};

        this.query = this.query.find(keyword);
        return this;
    }

    /** Apply price, rating, and category filters from the query string. */
    filter() {
        const queryCopy = { ...this.queryString };
        const excludedFields = ["keyword", "page", "limit"];
        excludedFields.forEach((key) => delete queryCopy[key]);

        // Convert gt/gte/lt/lte to MongoDB operators
        let queryStr = JSON.stringify(queryCopy);
        queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g, (key) => `$${key}`);

        this.query = this.query.find(JSON.parse(queryStr));
        return this;
    }

    /**
     * Limit results to a page window.
     * @param {number} resultPerPage - Number of items per page
     */
    pagination(resultPerPage) {
        const currentPage = Math.max(Number(this.queryString.page) || 1, 1);
        const skip = resultPerPage * (currentPage - 1);
        this.query = this.query.limit(resultPerPage).skip(skip);
        return this;
    }
}

export default ApiFeatures;
