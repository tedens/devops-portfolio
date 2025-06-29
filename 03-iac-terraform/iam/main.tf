# module "iam" {
#   source = "git::https://github.com/tedens/tf-modules.git//AWS/iam?ref=main"

#   project_name = var.project_name
#   env          = var.env
#   region       = var.region

#   # Example IAM roles/policies (customize based on your module’s inputs)
#   create_basic_role     = true
#   create_instance_role  = true
#   create_lambda_role    = false

#   tags = {
#     Environment = var.env
#     Project     = var.project_name
#   }
# }
