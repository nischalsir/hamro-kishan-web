export type UserRole = 'farmer' | 'buyer' | 'expert' | 'admin';

export interface User {
  id: string;
  role: UserRole;
  name: string;
  phone: string;
  email: string;
  created_at: string;
}

export interface FarmerProfile {
  id: string;
  user_id: string;
  location: string;
  farm_type: string;
}

export interface BuyerProfile {
  id: string;
  user_id: string;
  business_name: string;
  location: string;
}

export interface ExpertProfile {
  id: string;
  user_id: string;
  specialization: string;
  experience_years: number;
}

export interface Product {
  id: string;
  farmer_id: string;
  name: string;
  category: string;
  price: number;
  quantity?: number;
  description: string;
  photo_url: string;
  status: 'active' | 'sold';
  created_at: string;
  farmer_name?: string;
  farmer_location?: string;
}

export interface PurchaseRequest {
  id: string;
  product_id: string;
  buyer_id: string;
  quantity_requested: number;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  product_name?: string;
  buyer_name?: string;
  buyer_business?: string;
}

export interface CropIssue {
  id: string;
  farmer_id: string;
  description: string;
  image_url: string;
  status: 'pending' | 'resolved';
  created_at: string;
  farmer_name?: string;
}

export interface ExpertAdvice {
  id: string;
  issue_id: string;
  expert_id: string;
  solution: string;
  preventive_tips: string;
  created_at: string;
}

export interface WeatherAlert {
  id: string;
  message: string;
  target_location: string;
  sent_at: string;
}
