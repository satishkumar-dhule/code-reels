/**
 * Certification-Specific Questions
 * Curated MCQ questions aligned with actual certification exam objectives
 */

export interface CertificationQuestion {
  id: string;
  certificationId: string;
  domain: string; // Exam domain/objective
  domainWeight: number; // % weight in actual exam
  question: string;
  options: {
    id: string;
    text: string;
    isCorrect: boolean;
  }[];
  explanation: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
}

export interface CertificationDomain {
  id: string;
  name: string;
  weight: number; // percentage in exam
  description: string;
}

export interface CertificationExamConfig {
  certificationId: string;
  domains: CertificationDomain[];
  totalQuestions: number;
  passingScore: number;
  timeLimit: number; // minutes
}

// AWS Solutions Architect Associate Domains (SAA-C03)
export const awsSaaDomains: CertificationDomain[] = [
  { id: 'design-secure', name: 'Design Secure Architectures', weight: 30, description: 'IAM, encryption, network security' },
  { id: 'design-resilient', name: 'Design Resilient Architectures', weight: 26, description: 'High availability, fault tolerance, disaster recovery' },
  { id: 'design-performant', name: 'Design High-Performing Architectures', weight: 24, description: 'Compute, storage, database optimization' },
  { id: 'design-cost', name: 'Design Cost-Optimized Architectures', weight: 20, description: 'Cost-effective solutions, pricing models' },
];

// CKA Domains
export const ckaDomains: CertificationDomain[] = [
  { id: 'cluster-arch', name: 'Cluster Architecture', weight: 25, description: 'Installation, configuration, RBAC' },
  { id: 'workloads', name: 'Workloads & Scheduling', weight: 15, description: 'Deployments, pods, scheduling' },
  { id: 'services', name: 'Services & Networking', weight: 20, description: 'Services, ingress, network policies' },
  { id: 'storage', name: 'Storage', weight: 10, description: 'Volumes, PV, PVC, storage classes' },
  { id: 'troubleshoot', name: 'Troubleshooting', weight: 30, description: 'Cluster and application debugging' },
];

// Terraform Associate Domains
export const terraformDomains: CertificationDomain[] = [
  { id: 'iac-concepts', name: 'IaC Concepts', weight: 15, description: 'Infrastructure as Code fundamentals' },
  { id: 'terraform-purpose', name: 'Terraform Purpose', weight: 10, description: 'Use cases and benefits' },
  { id: 'terraform-basics', name: 'Terraform Basics', weight: 20, description: 'CLI, providers, resources' },
  { id: 'terraform-state', name: 'Terraform State', weight: 15, description: 'State management, backends' },
  { id: 'modules', name: 'Modules', weight: 15, description: 'Module creation and usage' },
  { id: 'workflow', name: 'Core Workflow', weight: 15, description: 'Write, plan, apply' },
  { id: 'cloud', name: 'Terraform Cloud', weight: 10, description: 'Remote operations, workspaces' },
];

// Exam configurations
export const examConfigs: Record<string, CertificationExamConfig> = {
  'aws-saa': {
    certificationId: 'aws-saa',
    domains: awsSaaDomains,
    totalQuestions: 65,
    passingScore: 72,
    timeLimit: 130,
  },
  'cka': {
    certificationId: 'cka',
    domains: ckaDomains,
    totalQuestions: 17,
    passingScore: 66,
    timeLimit: 120,
  },
  'terraform-associate': {
    certificationId: 'terraform-associate',
    domains: terraformDomains,
    totalQuestions: 57,
    passingScore: 70,
    timeLimit: 60,
  },
};

// Sample certification questions - AWS SAA
export const certificationQuestions: CertificationQuestion[] = [
  // AWS SAA - Design Secure Architectures
  {
    id: 'aws-saa-001',
    certificationId: 'aws-saa',
    domain: 'design-secure',
    domainWeight: 30,
    question: 'A company needs to ensure that all data stored in S3 is encrypted at rest using keys managed by the company. Which encryption option should they use?',
    options: [
      { id: 'a', text: 'SSE-S3', isCorrect: false },
      { id: 'b', text: 'SSE-KMS with customer managed keys', isCorrect: true },
      { id: 'c', text: 'SSE-C', isCorrect: false },
      { id: 'd', text: 'Client-side encryption', isCorrect: false },
    ],
    explanation: 'SSE-KMS with customer managed keys (CMK) allows the company to manage their own encryption keys in AWS KMS while still using server-side encryption. SSE-S3 uses AWS-managed keys, SSE-C requires customers to manage keys outside AWS, and client-side encryption happens before upload.',
    difficulty: 'intermediate',
    tags: ['s3', 'encryption', 'kms', 'security'],
  },
  {
    id: 'aws-saa-002',
    certificationId: 'aws-saa',
    domain: 'design-secure',
    domainWeight: 30,
    question: 'Which IAM policy element is used to specify the resources that the policy applies to?',
    options: [
      { id: 'a', text: 'Action', isCorrect: false },
      { id: 'b', text: 'Effect', isCorrect: false },
      { id: 'c', text: 'Resource', isCorrect: true },
      { id: 'd', text: 'Principal', isCorrect: false },
    ],
    explanation: 'The Resource element specifies the AWS resources to which the policy applies using ARNs. Action specifies allowed/denied actions, Effect specifies Allow/Deny, and Principal specifies who the policy applies to.',
    difficulty: 'beginner',
    tags: ['iam', 'policy', 'security'],
  },
  {
    id: 'aws-saa-003',
    certificationId: 'aws-saa',
    domain: 'design-secure',
    domainWeight: 30,
    question: 'A solutions architect needs to restrict access to an S3 bucket so that objects can only be accessed through CloudFront. What should they configure?',
    options: [
      { id: 'a', text: 'S3 bucket policy with VPC endpoint condition', isCorrect: false },
      { id: 'b', text: 'Origin Access Control (OAC) with S3 bucket policy', isCorrect: true },
      { id: 'c', text: 'IAM role for CloudFront', isCorrect: false },
      { id: 'd', text: 'S3 Access Points', isCorrect: false },
    ],
    explanation: 'Origin Access Control (OAC) is the recommended way to restrict S3 access to CloudFront only. It replaces the legacy Origin Access Identity (OAI). The S3 bucket policy is updated to only allow access from the CloudFront distribution.',
    difficulty: 'intermediate',
    tags: ['s3', 'cloudfront', 'security', 'oac'],
  },

  // AWS SAA - Design Resilient Architectures
  {
    id: 'aws-saa-004',
    certificationId: 'aws-saa',
    domain: 'design-resilient',
    domainWeight: 26,
    question: 'A company requires their application to remain available even if an entire AWS Region fails. Which architecture pattern should they implement?',
    options: [
      { id: 'a', text: 'Multi-AZ deployment', isCorrect: false },
      { id: 'b', text: 'Multi-Region active-passive with Route 53 failover', isCorrect: true },
      { id: 'c', text: 'Auto Scaling across multiple AZs', isCorrect: false },
      { id: 'd', text: 'Elastic Load Balancer with health checks', isCorrect: false },
    ],
    explanation: 'Multi-Region deployment is required for regional failure resilience. Route 53 failover routing can direct traffic to a standby region when the primary fails. Multi-AZ only protects against AZ failures within a single region.',
    difficulty: 'intermediate',
    tags: ['high-availability', 'disaster-recovery', 'route53', 'multi-region'],
  },
  {
    id: 'aws-saa-005',
    certificationId: 'aws-saa',
    domain: 'design-resilient',
    domainWeight: 26,
    question: 'Which RDS feature provides automatic failover to a standby replica in another Availability Zone?',
    options: [
      { id: 'a', text: 'Read Replicas', isCorrect: false },
      { id: 'b', text: 'Multi-AZ deployment', isCorrect: true },
      { id: 'c', text: 'Aurora Global Database', isCorrect: false },
      { id: 'd', text: 'Database snapshots', isCorrect: false },
    ],
    explanation: 'Multi-AZ deployment maintains a synchronous standby replica in a different AZ. AWS automatically fails over to the standby (typically 60-120 seconds) if the primary fails. Read Replicas are for read scaling, not automatic failover.',
    difficulty: 'beginner',
    tags: ['rds', 'high-availability', 'multi-az', 'database'],
  },
  {
    id: 'aws-saa-006',
    certificationId: 'aws-saa',
    domain: 'design-resilient',
    domainWeight: 26,
    question: 'An application uses SQS to decouple components. Messages are being processed multiple times. What should be implemented to prevent duplicate processing?',
    options: [
      { id: 'a', text: 'Increase visibility timeout', isCorrect: false },
      { id: 'b', text: 'Use FIFO queue with deduplication', isCorrect: true },
      { id: 'c', text: 'Enable long polling', isCorrect: false },
      { id: 'd', text: 'Use dead letter queue', isCorrect: false },
    ],
    explanation: 'SQS FIFO queues provide exactly-once processing through message deduplication. Standard queues offer at-least-once delivery which can result in duplicates. Visibility timeout prevents re-processing during processing but doesn\'t prevent duplicates.',
    difficulty: 'intermediate',
    tags: ['sqs', 'messaging', 'fifo', 'deduplication'],
  },

  // AWS SAA - Design High-Performing Architectures
  {
    id: 'aws-saa-007',
    certificationId: 'aws-saa',
    domain: 'design-performant',
    domainWeight: 24,
    question: 'A web application experiences variable traffic with unpredictable spikes. Which EC2 purchasing option provides the best balance of cost and availability?',
    options: [
      { id: 'a', text: 'Reserved Instances only', isCorrect: false },
      { id: 'b', text: 'Spot Instances only', isCorrect: false },
      { id: 'c', text: 'On-Demand with Auto Scaling', isCorrect: true },
      { id: 'd', text: 'Dedicated Hosts', isCorrect: false },
    ],
    explanation: 'On-Demand instances with Auto Scaling provide flexibility for unpredictable workloads. Reserved Instances are cost-effective for steady-state but don\'t handle spikes. Spot Instances can be interrupted and aren\'t suitable for critical web traffic.',
    difficulty: 'intermediate',
    tags: ['ec2', 'auto-scaling', 'cost-optimization', 'compute'],
  },
  {
    id: 'aws-saa-008',
    certificationId: 'aws-saa',
    domain: 'design-performant',
    domainWeight: 24,
    question: 'Which service should be used to cache frequently accessed data to reduce database load?',
    options: [
      { id: 'a', text: 'Amazon S3', isCorrect: false },
      { id: 'b', text: 'Amazon ElastiCache', isCorrect: true },
      { id: 'c', text: 'Amazon EBS', isCorrect: false },
      { id: 'd', text: 'AWS Storage Gateway', isCorrect: false },
    ],
    explanation: 'ElastiCache (Redis or Memcached) is designed for in-memory caching to reduce database load and improve application performance. It provides sub-millisecond latency for frequently accessed data.',
    difficulty: 'beginner',
    tags: ['elasticache', 'caching', 'performance', 'database'],
  },

  // AWS SAA - Design Cost-Optimized Architectures
  {
    id: 'aws-saa-009',
    certificationId: 'aws-saa',
    domain: 'design-cost',
    domainWeight: 20,
    question: 'A company has predictable, steady-state workloads running 24/7. Which EC2 purchasing option offers the most cost savings?',
    options: [
      { id: 'a', text: 'On-Demand Instances', isCorrect: false },
      { id: 'b', text: 'Spot Instances', isCorrect: false },
      { id: 'c', text: 'Reserved Instances (1 or 3 year)', isCorrect: true },
      { id: 'd', text: 'Scheduled Reserved Instances', isCorrect: false },
    ],
    explanation: 'Reserved Instances offer up to 72% discount compared to On-Demand for steady-state workloads with 1 or 3 year commitments. Spot Instances are cheaper but can be interrupted. Savings Plans also offer similar benefits with more flexibility.',
    difficulty: 'beginner',
    tags: ['ec2', 'cost-optimization', 'reserved-instances', 'pricing'],
  },
  {
    id: 'aws-saa-010',
    certificationId: 'aws-saa',
    domain: 'design-cost',
    domainWeight: 20,
    question: 'Which S3 storage class is most cost-effective for data that is accessed once a month and can tolerate retrieval delays?',
    options: [
      { id: 'a', text: 'S3 Standard', isCorrect: false },
      { id: 'b', text: 'S3 Standard-IA', isCorrect: false },
      { id: 'c', text: 'S3 Glacier Flexible Retrieval', isCorrect: true },
      { id: 'd', text: 'S3 One Zone-IA', isCorrect: false },
    ],
    explanation: 'S3 Glacier Flexible Retrieval is ideal for archive data accessed infrequently (monthly or less) where retrieval times of minutes to hours are acceptable. It offers significant cost savings over Standard-IA for this access pattern.',
    difficulty: 'intermediate',
    tags: ['s3', 'storage-classes', 'glacier', 'cost-optimization'],
  },

  // CKA Questions
  {
    id: 'cka-001',
    certificationId: 'cka',
    domain: 'cluster-arch',
    domainWeight: 25,
    question: 'Which component is responsible for scheduling pods to nodes in a Kubernetes cluster?',
    options: [
      { id: 'a', text: 'kubelet', isCorrect: false },
      { id: 'b', text: 'kube-scheduler', isCorrect: true },
      { id: 'c', text: 'kube-controller-manager', isCorrect: false },
      { id: 'd', text: 'etcd', isCorrect: false },
    ],
    explanation: 'kube-scheduler watches for newly created pods with no assigned node and selects a node for them to run on based on resource requirements, constraints, and policies.',
    difficulty: 'beginner',
    tags: ['kubernetes', 'scheduler', 'control-plane', 'architecture'],
  },
  {
    id: 'cka-002',
    certificationId: 'cka',
    domain: 'cluster-arch',
    domainWeight: 25,
    question: 'What is the purpose of etcd in a Kubernetes cluster?',
    options: [
      { id: 'a', text: 'Container runtime', isCorrect: false },
      { id: 'b', text: 'Network proxy', isCorrect: false },
      { id: 'c', text: 'Cluster state storage', isCorrect: true },
      { id: 'd', text: 'Pod scheduling', isCorrect: false },
    ],
    explanation: 'etcd is a distributed key-value store that stores all cluster data including configuration, state, and metadata. It\'s the source of truth for the cluster state.',
    difficulty: 'beginner',
    tags: ['kubernetes', 'etcd', 'storage', 'architecture'],
  },
  {
    id: 'cka-003',
    certificationId: 'cka',
    domain: 'workloads',
    domainWeight: 15,
    question: 'Which kubectl command creates a deployment named "nginx" with 3 replicas?',
    options: [
      { id: 'a', text: 'kubectl run nginx --replicas=3', isCorrect: false },
      { id: 'b', text: 'kubectl create deployment nginx --replicas=3', isCorrect: true },
      { id: 'c', text: 'kubectl apply deployment nginx --replicas=3', isCorrect: false },
      { id: 'd', text: 'kubectl deploy nginx --replicas=3', isCorrect: false },
    ],
    explanation: 'kubectl create deployment creates a new deployment. The --replicas flag sets the desired number of pod replicas. kubectl run creates a pod, not a deployment.',
    difficulty: 'beginner',
    tags: ['kubernetes', 'kubectl', 'deployment', 'workloads'],
  },
  {
    id: 'cka-004',
    certificationId: 'cka',
    domain: 'services',
    domainWeight: 20,
    question: 'Which Service type exposes the service on each node\'s IP at a static port?',
    options: [
      { id: 'a', text: 'ClusterIP', isCorrect: false },
      { id: 'b', text: 'NodePort', isCorrect: true },
      { id: 'c', text: 'LoadBalancer', isCorrect: false },
      { id: 'd', text: 'ExternalName', isCorrect: false },
    ],
    explanation: 'NodePort exposes the service on each node\'s IP at a static port (30000-32767 by default). ClusterIP is internal only, LoadBalancer provisions an external load balancer, ExternalName maps to a DNS name.',
    difficulty: 'beginner',
    tags: ['kubernetes', 'services', 'networking', 'nodeport'],
  },
  {
    id: 'cka-005',
    certificationId: 'cka',
    domain: 'storage',
    domainWeight: 10,
    question: 'What is the correct order of operations when a pod requests persistent storage?',
    options: [
      { id: 'a', text: 'PV → PVC → Pod', isCorrect: false },
      { id: 'b', text: 'PVC → PV → Pod', isCorrect: false },
      { id: 'c', text: 'StorageClass → PVC → PV (dynamic) → Pod', isCorrect: true },
      { id: 'd', text: 'Pod → PVC → PV', isCorrect: false },
    ],
    explanation: 'With dynamic provisioning: StorageClass defines the provisioner, PVC requests storage referencing the StorageClass, PV is dynamically created, then the Pod mounts the PVC.',
    difficulty: 'intermediate',
    tags: ['kubernetes', 'storage', 'pv', 'pvc', 'storageclass'],
  },
  {
    id: 'cka-006',
    certificationId: 'cka',
    domain: 'troubleshoot',
    domainWeight: 30,
    question: 'A pod is stuck in "Pending" state. Which command helps identify the scheduling issue?',
    options: [
      { id: 'a', text: 'kubectl logs <pod>', isCorrect: false },
      { id: 'b', text: 'kubectl describe pod <pod>', isCorrect: true },
      { id: 'c', text: 'kubectl exec <pod> -- sh', isCorrect: false },
      { id: 'd', text: 'kubectl top pod <pod>', isCorrect: false },
    ],
    explanation: 'kubectl describe pod shows events and conditions including scheduling failures. The Events section reveals why the scheduler couldn\'t place the pod (insufficient resources, node selectors, taints, etc.).',
    difficulty: 'beginner',
    tags: ['kubernetes', 'troubleshooting', 'kubectl', 'debugging'],
  },

  // Terraform Questions
  {
    id: 'tf-001',
    certificationId: 'terraform-associate',
    domain: 'iac-concepts',
    domainWeight: 15,
    question: 'What is the primary benefit of Infrastructure as Code?',
    options: [
      { id: 'a', text: 'Faster network speeds', isCorrect: false },
      { id: 'b', text: 'Version control and reproducibility', isCorrect: true },
      { id: 'c', text: 'Lower cloud costs', isCorrect: false },
      { id: 'd', text: 'Automatic security patches', isCorrect: false },
    ],
    explanation: 'IaC enables version control, reproducibility, and consistency. Infrastructure can be reviewed, tested, and rolled back like application code. While it can help optimize costs, that\'s not the primary benefit.',
    difficulty: 'beginner',
    tags: ['terraform', 'iac', 'fundamentals'],
  },
  {
    id: 'tf-002',
    certificationId: 'terraform-associate',
    domain: 'terraform-basics',
    domainWeight: 20,
    question: 'Which command initializes a Terraform working directory?',
    options: [
      { id: 'a', text: 'terraform start', isCorrect: false },
      { id: 'b', text: 'terraform init', isCorrect: true },
      { id: 'c', text: 'terraform begin', isCorrect: false },
      { id: 'd', text: 'terraform setup', isCorrect: false },
    ],
    explanation: 'terraform init initializes the working directory, downloads providers, and sets up the backend. It must be run before other commands like plan or apply.',
    difficulty: 'beginner',
    tags: ['terraform', 'cli', 'init', 'basics'],
  },
  {
    id: 'tf-003',
    certificationId: 'terraform-associate',
    domain: 'terraform-state',
    domainWeight: 15,
    question: 'Where does Terraform store state by default?',
    options: [
      { id: 'a', text: 'In memory only', isCorrect: false },
      { id: 'b', text: 'terraform.tfstate file locally', isCorrect: true },
      { id: 'c', text: 'Terraform Cloud', isCorrect: false },
      { id: 'd', text: 'AWS S3', isCorrect: false },
    ],
    explanation: 'By default, Terraform stores state in a local file named terraform.tfstate. For team collaboration, remote backends like S3 or Terraform Cloud are recommended.',
    difficulty: 'beginner',
    tags: ['terraform', 'state', 'tfstate', 'basics'],
  },
  {
    id: 'tf-004',
    certificationId: 'terraform-associate',
    domain: 'modules',
    domainWeight: 15,
    question: 'How do you reference an output from a child module?',
    options: [
      { id: 'a', text: 'var.module_name.output_name', isCorrect: false },
      { id: 'b', text: 'module.module_name.output_name', isCorrect: true },
      { id: 'c', text: 'output.module_name.output_name', isCorrect: false },
      { id: 'd', text: 'data.module_name.output_name', isCorrect: false },
    ],
    explanation: 'Module outputs are accessed using module.<MODULE_NAME>.<OUTPUT_NAME>. The module block name is used, not the source path.',
    difficulty: 'intermediate',
    tags: ['terraform', 'modules', 'outputs', 'references'],
  },
  {
    id: 'tf-005',
    certificationId: 'terraform-associate',
    domain: 'workflow',
    domainWeight: 15,
    question: 'What is the correct order of the core Terraform workflow?',
    options: [
      { id: 'a', text: 'Apply → Plan → Write', isCorrect: false },
      { id: 'b', text: 'Write → Apply → Plan', isCorrect: false },
      { id: 'c', text: 'Write → Plan → Apply', isCorrect: true },
      { id: 'd', text: 'Plan → Write → Apply', isCorrect: false },
    ],
    explanation: 'The core workflow is Write (author configuration), Plan (preview changes), Apply (execute changes). This ensures changes are reviewed before being applied.',
    difficulty: 'beginner',
    tags: ['terraform', 'workflow', 'plan', 'apply'],
  },

  // Additional AWS SAA Questions
  {
    id: 'aws-saa-011',
    certificationId: 'aws-saa',
    domain: 'design-secure',
    domainWeight: 30,
    question: 'Which AWS service provides a virtual private network connection between your on-premises network and AWS?',
    options: [
      { id: 'a', text: 'AWS Direct Connect', isCorrect: false },
      { id: 'b', text: 'AWS Site-to-Site VPN', isCorrect: true },
      { id: 'c', text: 'AWS Transit Gateway', isCorrect: false },
      { id: 'd', text: 'Amazon VPC Peering', isCorrect: false },
    ],
    explanation: 'AWS Site-to-Site VPN creates an encrypted tunnel over the internet between your on-premises network and AWS VPC. Direct Connect provides a dedicated physical connection, not VPN.',
    difficulty: 'intermediate',
    tags: ['vpn', 'networking', 'hybrid', 'security'],
  },
  {
    id: 'aws-saa-012',
    certificationId: 'aws-saa',
    domain: 'design-resilient',
    domainWeight: 26,
    question: 'An application requires exactly-once message processing. Which SQS queue type should be used?',
    options: [
      { id: 'a', text: 'Standard Queue with visibility timeout', isCorrect: false },
      { id: 'b', text: 'FIFO Queue', isCorrect: true },
      { id: 'c', text: 'Dead Letter Queue', isCorrect: false },
      { id: 'd', text: 'Standard Queue with long polling', isCorrect: false },
    ],
    explanation: 'FIFO (First-In-First-Out) queues provide exactly-once processing and maintain message order. Standard queues offer at-least-once delivery which can result in duplicates.',
    difficulty: 'intermediate',
    tags: ['sqs', 'messaging', 'fifo', 'resilience'],
  },
  {
    id: 'aws-saa-013',
    certificationId: 'aws-saa',
    domain: 'design-performant',
    domainWeight: 24,
    question: 'Which EBS volume type provides the highest IOPS performance for transactional workloads?',
    options: [
      { id: 'a', text: 'gp3 (General Purpose SSD)', isCorrect: false },
      { id: 'b', text: 'io2 Block Express', isCorrect: true },
      { id: 'c', text: 'st1 (Throughput Optimized HDD)', isCorrect: false },
      { id: 'd', text: 'sc1 (Cold HDD)', isCorrect: false },
    ],
    explanation: 'io2 Block Express provides up to 256,000 IOPS and is designed for the most demanding I/O-intensive workloads. gp3 maxes out at 16,000 IOPS.',
    difficulty: 'intermediate',
    tags: ['ebs', 'storage', 'performance', 'iops'],
  },
  {
    id: 'aws-saa-014',
    certificationId: 'aws-saa',
    domain: 'design-cost',
    domainWeight: 20,
    question: 'Which pricing model allows you to bid on unused EC2 capacity at up to 90% discount?',
    options: [
      { id: 'a', text: 'Reserved Instances', isCorrect: false },
      { id: 'b', text: 'Savings Plans', isCorrect: false },
      { id: 'c', text: 'Spot Instances', isCorrect: true },
      { id: 'd', text: 'Dedicated Hosts', isCorrect: false },
    ],
    explanation: 'Spot Instances let you use spare EC2 capacity at up to 90% discount. However, instances can be interrupted with 2-minute notice when AWS needs the capacity back.',
    difficulty: 'beginner',
    tags: ['ec2', 'spot', 'cost', 'pricing'],
  },
  {
    id: 'aws-saa-015',
    certificationId: 'aws-saa',
    domain: 'design-secure',
    domainWeight: 30,
    question: 'Which service should be used to centrally manage SSL/TLS certificates for AWS services?',
    options: [
      { id: 'a', text: 'AWS Secrets Manager', isCorrect: false },
      { id: 'b', text: 'AWS Certificate Manager (ACM)', isCorrect: true },
      { id: 'c', text: 'AWS KMS', isCorrect: false },
      { id: 'd', text: 'AWS IAM', isCorrect: false },
    ],
    explanation: 'AWS Certificate Manager (ACM) handles provisioning, managing, and deploying SSL/TLS certificates. It integrates with ELB, CloudFront, and API Gateway.',
    difficulty: 'beginner',
    tags: ['acm', 'ssl', 'tls', 'certificates', 'security'],
  },

  // Additional CKA Questions
  {
    id: 'cka-007',
    certificationId: 'cka',
    domain: 'workloads',
    domainWeight: 15,
    question: 'Which resource ensures a specified number of pod replicas are running at any time?',
    options: [
      { id: 'a', text: 'Pod', isCorrect: false },
      { id: 'b', text: 'ReplicaSet', isCorrect: true },
      { id: 'c', text: 'Service', isCorrect: false },
      { id: 'd', text: 'ConfigMap', isCorrect: false },
    ],
    explanation: 'ReplicaSet maintains a stable set of replica pods running at any given time. Deployments manage ReplicaSets and provide declarative updates.',
    difficulty: 'beginner',
    tags: ['kubernetes', 'replicaset', 'workloads', 'pods'],
  },
  {
    id: 'cka-008',
    certificationId: 'cka',
    domain: 'services',
    domainWeight: 20,
    question: 'What is the default Service type in Kubernetes?',
    options: [
      { id: 'a', text: 'NodePort', isCorrect: false },
      { id: 'b', text: 'LoadBalancer', isCorrect: false },
      { id: 'c', text: 'ClusterIP', isCorrect: true },
      { id: 'd', text: 'ExternalName', isCorrect: false },
    ],
    explanation: 'ClusterIP is the default Service type. It exposes the service on a cluster-internal IP, making it only reachable from within the cluster.',
    difficulty: 'beginner',
    tags: ['kubernetes', 'services', 'clusterip', 'networking'],
  },
  {
    id: 'cka-009',
    certificationId: 'cka',
    domain: 'troubleshoot',
    domainWeight: 30,
    question: 'Which command shows the logs of a crashed container in a pod?',
    options: [
      { id: 'a', text: 'kubectl logs <pod> --previous', isCorrect: true },
      { id: 'b', text: 'kubectl describe pod <pod>', isCorrect: false },
      { id: 'c', text: 'kubectl get events', isCorrect: false },
      { id: 'd', text: 'kubectl exec <pod> -- cat /var/log/messages', isCorrect: false },
    ],
    explanation: 'The --previous flag retrieves logs from the previous instance of a container, useful for debugging crashes. Without it, you only see current container logs.',
    difficulty: 'intermediate',
    tags: ['kubernetes', 'logs', 'troubleshooting', 'debugging'],
  },
  {
    id: 'cka-010',
    certificationId: 'cka',
    domain: 'cluster-arch',
    domainWeight: 25,
    question: 'Which component runs on every node and maintains network rules?',
    options: [
      { id: 'a', text: 'kubelet', isCorrect: false },
      { id: 'b', text: 'kube-proxy', isCorrect: true },
      { id: 'c', text: 'kube-scheduler', isCorrect: false },
      { id: 'd', text: 'coredns', isCorrect: false },
    ],
    explanation: 'kube-proxy runs on each node and maintains network rules that allow network communication to pods. It implements part of the Kubernetes Service concept.',
    difficulty: 'beginner',
    tags: ['kubernetes', 'kube-proxy', 'networking', 'architecture'],
  },

  // Additional Terraform Questions
  {
    id: 'tf-006',
    certificationId: 'terraform-associate',
    domain: 'terraform-basics',
    domainWeight: 20,
    question: 'Which command shows what Terraform will do without making changes?',
    options: [
      { id: 'a', text: 'terraform show', isCorrect: false },
      { id: 'b', text: 'terraform plan', isCorrect: true },
      { id: 'c', text: 'terraform validate', isCorrect: false },
      { id: 'd', text: 'terraform refresh', isCorrect: false },
    ],
    explanation: 'terraform plan creates an execution plan showing what actions Terraform will take without actually making changes. It\'s a dry-run preview.',
    difficulty: 'beginner',
    tags: ['terraform', 'plan', 'cli', 'basics'],
  },
  {
    id: 'tf-007',
    certificationId: 'terraform-associate',
    domain: 'terraform-state',
    domainWeight: 15,
    question: 'What happens if you lose your Terraform state file?',
    options: [
      { id: 'a', text: 'Nothing, Terraform recreates it automatically', isCorrect: false },
      { id: 'b', text: 'Terraform loses track of managed resources', isCorrect: true },
      { id: 'c', text: 'All resources are automatically destroyed', isCorrect: false },
      { id: 'd', text: 'Terraform imports resources from the cloud', isCorrect: false },
    ],
    explanation: 'Without state, Terraform cannot map configuration to real resources. It would try to create new resources instead of managing existing ones. State backup is critical.',
    difficulty: 'intermediate',
    tags: ['terraform', 'state', 'disaster-recovery', 'best-practices'],
  },
  {
    id: 'tf-008',
    certificationId: 'terraform-associate',
    domain: 'modules',
    domainWeight: 15,
    question: 'What is the purpose of the "source" argument in a module block?',
    options: [
      { id: 'a', text: 'Defines input variables', isCorrect: false },
      { id: 'b', text: 'Specifies where to find the module code', isCorrect: true },
      { id: 'c', text: 'Sets the module version', isCorrect: false },
      { id: 'd', text: 'Configures the provider', isCorrect: false },
    ],
    explanation: 'The source argument tells Terraform where to find the module\'s configuration files. It can be a local path, Git URL, Terraform Registry, or other sources.',
    difficulty: 'beginner',
    tags: ['terraform', 'modules', 'source', 'configuration'],
  },
  {
    id: 'tf-009',
    certificationId: 'terraform-associate',
    domain: 'cloud',
    domainWeight: 10,
    question: 'What is the primary benefit of using Terraform Cloud for team collaboration?',
    options: [
      { id: 'a', text: 'Faster execution speed', isCorrect: false },
      { id: 'b', text: 'Remote state management and locking', isCorrect: true },
      { id: 'c', text: 'Free unlimited resources', isCorrect: false },
      { id: 'd', text: 'Automatic code generation', isCorrect: false },
    ],
    explanation: 'Terraform Cloud provides remote state storage with locking, preventing concurrent modifications. It also offers run history, policy enforcement, and team access controls.',
    difficulty: 'intermediate',
    tags: ['terraform', 'cloud', 'collaboration', 'state'],
  },
  {
    id: 'tf-010',
    certificationId: 'terraform-associate',
    domain: 'iac-concepts',
    domainWeight: 15,
    question: 'What does "idempotent" mean in the context of Infrastructure as Code?',
    options: [
      { id: 'a', text: 'Code runs faster each time', isCorrect: false },
      { id: 'b', text: 'Applying the same config multiple times produces the same result', isCorrect: true },
      { id: 'c', text: 'Resources are created in parallel', isCorrect: false },
      { id: 'd', text: 'Changes are automatically rolled back on failure', isCorrect: false },
    ],
    explanation: 'Idempotency means running the same operation multiple times produces the same result. Terraform achieves this by comparing desired state with actual state.',
    difficulty: 'intermediate',
    tags: ['terraform', 'iac', 'idempotent', 'concepts'],
  },
];

// Helper functions
export function getQuestionsForCertification(certificationId: string): CertificationQuestion[] {
  return certificationQuestions.filter(q => q.certificationId === certificationId);
}

export function getQuestionsByDomain(certificationId: string, domain: string): CertificationQuestion[] {
  return certificationQuestions.filter(q => q.certificationId === certificationId && q.domain === domain);
}

export function getExamConfig(certificationId: string): CertificationExamConfig | undefined {
  return examConfigs[certificationId];
}

export function getDomainProgress(certificationId: string, answeredQuestions: Map<string, boolean>): Record<string, { total: number; correct: number; percentage: number }> {
  const questions = getQuestionsForCertification(certificationId);
  const config = getExamConfig(certificationId);
  if (!config) return {};

  const progress: Record<string, { total: number; correct: number; percentage: number }> = {};
  
  config.domains.forEach(domain => {
    const domainQuestions = questions.filter(q => q.domain === domain.id);
    const answered = domainQuestions.filter(q => answeredQuestions.has(q.id));
    const correct = answered.filter(q => answeredQuestions.get(q.id) === true);
    
    progress[domain.id] = {
      total: domainQuestions.length,
      correct: correct.length,
      percentage: answered.length > 0 ? Math.round((correct.length / answered.length) * 100) : 0,
    };
  });

  return progress;
}

import { generateProgressiveSequence } from './progressive-quiz';

// Generate a practice session with weighted domain distribution and progressive difficulty
export function generatePracticeSession(certificationId: string, questionCount: number = 10): CertificationQuestion[] {
  const questions = getQuestionsForCertification(certificationId);
  const config = getExamConfig(certificationId);
  
  if (!config || questions.length === 0) {
    return generateProgressiveSequence(questions, questionCount);
  }

  const session: CertificationQuestion[] = [];
  
  // Distribute questions by domain weight
  config.domains.forEach(domain => {
    const domainQuestions = questions.filter(q => q.domain === domain.id);
    const count = Math.max(1, Math.round((domain.weight / 100) * questionCount));
    // Use progressive selection within each domain
    const selected = generateProgressiveSequence(domainQuestions, count);
    session.push(...selected);
  });

  // Apply progressive selection to final set (maintains domain distribution but orders progressively)
  return generateProgressiveSequence(session, questionCount);
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
