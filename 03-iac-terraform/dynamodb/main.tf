# module "dynamodb" {
#   source = "git::https://github.com/tedens/tf-modules.git//AWS/dynamodb?ref=main"

#   table_name = "${var.env}-${var.project_name}-locks"
#   billing_mode = "PAY_PER_REQUEST"

#   hash_key = "LockID"
#   attributes = [
#     {
#       name = "LockID"
#       type = "S"
#     }
#   ]

#   tags = {
#     Environment = var.env
#     Project     = var.project_name
#   }
# }
