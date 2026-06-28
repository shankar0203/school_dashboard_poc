# ===========================================================================
#  Domain + HTTPS:  Route 53 (DNS) + ACM (cert) + ALB (TLS termination)
#  Flow:  trackya.in -> ALB (443, ACM cert) -> EC2:80 (nginx)
#
#  TWO-PHASE APPLY (because ACM DNS validation needs the domain delegated to
#  Route 53 first):
#    1) terraform apply -target=aws_route53_zone.main
#       -> copy the 4 nameservers from `terraform output route53_nameservers`
#       -> set them as the domain's nameservers in GoDaddy, wait for propagation
#    2) terraform apply        (cert validates, ALB comes up, records created)
# ===========================================================================

# --- Route 53 hosted zone for the domain ----------------------------------
resource "aws_route53_zone" "main" {
  name = var.domain_name
}

# --- ACM public certificate (must be in the same region as the ALB) -------
resource "aws_acm_certificate" "cert" {
  domain_name               = var.domain_name
  subject_alternative_names = ["www.${var.domain_name}"]
  validation_method         = "DNS"
  lifecycle { create_before_destroy = true }
}

# DNS records that prove domain ownership (created in the R53 zone)
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.cert.domain_validation_options : dvo.domain_name => {
      name = dvo.resource_record_name, type = dvo.resource_record_type, record = dvo.resource_record_value
    }
  }
  zone_id = aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "cert" {
  certificate_arn         = aws_acm_certificate.cert.arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}

# --- Security group for the ALB -------------------------------------------
resource "aws_security_group" "alb" {
  name        = "${var.project}-alb-sg"
  description = "Public HTTP/HTTPS to the load balancer"
  vpc_id      = data.aws_vpc.default.id
  ingress { description = "HTTP"  from_port = 80  to_port = 80  protocol = "tcp" cidr_blocks = ["0.0.0.0/0"] }
  ingress { description = "HTTPS" from_port = 443 to_port = 443 protocol = "tcp" cidr_blocks = ["0.0.0.0/0"] }
  egress  { from_port = 0 to_port = 0 protocol = "-1" cidr_blocks = ["0.0.0.0/0"] }
}

# allow the ALB to reach the EC2 on port 80
resource "aws_security_group_rule" "ec2_from_alb" {
  type                     = "ingress"
  from_port                = 80
  to_port                  = 80
  protocol                 = "tcp"
  security_group_id        = aws_security_group.ec2.id
  source_security_group_id = aws_security_group.alb.id
  description              = "HTTP from ALB"
}

# --- Application Load Balancer --------------------------------------------
resource "aws_lb" "app" {
  name               = "${var.project}-alb"
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = data.aws_subnets.default.ids
}

resource "aws_lb_target_group" "app" {
  name        = "${var.project}-tg"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = data.aws_vpc.default.id
  target_type = "instance"
  health_check {
    path                = "/"
    matcher             = "200-399"
    healthy_threshold   = 2
    unhealthy_threshold = 5
  }
}

resource "aws_lb_target_group_attachment" "app" {
  target_group_arn = aws_lb_target_group.app.arn
  target_id        = module.ec2.instance_id
  port             = 80
}

# HTTPS listener (uses the ACM cert) -> forwards to EC2
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.app.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = aws_acm_certificate_validation.cert.certificate_arn
  default_action { type = "forward" target_group_arn = aws_lb_target_group.app.arn }
}

# HTTP listener -> redirect to HTTPS
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.app.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type = "redirect"
    redirect { port = "443" protocol = "HTTPS" status_code = "HTTP_301" }
  }
}

# --- Point the domain (root + www) at the ALB -----------------------------
resource "aws_route53_record" "root" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"
  alias { name = aws_lb.app.dns_name zone_id = aws_lb.app.zone_id evaluate_target_health = true }
}

resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.${var.domain_name}"
  type    = "A"
  alias { name = aws_lb.app.dns_name zone_id = aws_lb.app.zone_id evaluate_target_health = true }
}
