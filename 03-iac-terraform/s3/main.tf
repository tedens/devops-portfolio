module "s3" {
  source = "git::https://github.com/tedens/tf-modules.git//AWS/s3?ref=main"

  bucket_name = "${var.env}-${var.project_name}-storage"
  acl         = "private"

  tags = {
    Environment = var.env
    Project     = var.project_name
  }
}
