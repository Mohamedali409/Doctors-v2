exports.errorHandling = async (err, req, res, next) => {
  console.log(err.stack);
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: "error message",
    error: err.message,
  });
};
